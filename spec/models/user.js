/**
 * user
 * get-native.com
 *
 * Created by henryehly on 2017/03/26.
 */

const SpecUtil        = require('../spec-util');
const db              = require('../../app/models');
const k               = require('../../config/keys.json');
const User            = db[k.Model.User];
const Video           = db[k.Model.Video];
const WritingAnswer   = db[k.Model.WritingAnswer];
const WritingQuestion = db[k.Model.WritingQuestion];
const Credential      = db[k.Model.Credential];
const StudySession    = db[k.Model.StudySession];
const Language        = db[k.Model.Language];

const Promise         = require('bluebird');
const assert          = require('assert');
const chance          = require('chance').Chance();
const _               = require('lodash');

describe('User', function() {
    const credentials = {
        password: '12345678'
    };

    let user = null;
    let englishLanguageId = null;
    let japaneseLanguageId = null;

    before(function() {
        this.timeout(SpecUtil.defaultTimeout);
        return Promise.join(SpecUtil.seedAll(), SpecUtil.startMailServer(), function() {
            return Language.findAll({attributes: [k.Attr.Code, k.Attr.Id]});
        }).then(function(languages) {
            languages = _.invokeMap(languages, 'get', {plain: true});
            englishLanguageId = _.find(languages, {code: 'en'})[k.Attr.Id];
            japaneseLanguageId = _.find(languages, {code: 'ja'})[k.Attr.Id];
        });
    });

    beforeEach(function() {
        this.timeout(SpecUtil.defaultTimeout);
        return Language.findOne().then(function(language) {
            return User.create({
                default_study_language_id: language.get(k.Attr.Id),
                email: chance.email()
            });
        }).then(function(_user) {
            user = _user;
            return Credential.create({user_id: user.get(k.Attr.Id)});
        });
    });

    after(function() {
        this.timeout(SpecUtil.defaultTimeout);
        return Promise.join(SpecUtil.seedAllUndo(), SpecUtil.stopMailServer());
    });

    describe('existsForEmail', function() {
        it(`should return true if a user exists for a given email address`, function() {
            return User.existsForEmail(user.email).then(assert);
        });

        it(`should return false if a user does not exist for a given email address`, function() {
            return User.existsForEmail('nonexistent@email.com').then(function(exists) {
                assert(!exists);
            });
        });

        it(`should throw a TypeError if the first argument is not an email address`, function() {
            assert.throws(function() {
                User.existsForEmail(123);
            }, TypeError);
        });
    });

    describe('calculateStudySessionStatsForLanguage', function() {
        it(`should throw a ReferenceError if no 'lang' is provided`, function() {
            assert.throws(function() {
                user.calculateStudySessionStatsForLanguage();
            }, ReferenceError);
        });

        it(`should throw a TypeError if the 'lang' argument is not a valid lang code`, function() {
            assert.throws(function() {
                user.calculateStudySessionStatsForLanguage('invalid');
            }, TypeError);
        });

        it(`should return the total study time for the specified language`, function() {
            const englishStudyTime      = 300;
            const japaneseStudyTime     = 420;
            const numberOfStudySessions = 5;

            const englishVideoPromise = Video.findOne({
                attributes: [k.Attr.Id],
                where: {language_id: englishLanguageId}
            });

            const japaneseVideoPromise = Video.findOne({
                attributes: [k.Attr.Id],
                where: {language_id: japaneseLanguageId}
            });

            return Promise.join(englishVideoPromise, japaneseVideoPromise, function(englishVideo, japaneseVideo) {
                const englishRecords = _.times(numberOfStudySessions, function(i) {
                    return {
                        video_id: englishVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: englishStudyTime,
                        is_completed: true
                    }
                });

                const japaneseRecords = _.times(numberOfStudySessions, function(i) {
                    return {
                        video_id: japaneseVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: japaneseStudyTime,
                        is_completed: true
                    }
                });

                _.set(_.first(japaneseRecords), k.Attr.IsCompleted, false);

                const createEnglishStudySessions  = StudySession.bulkCreate(englishRecords);
                const createJapaneseStudySessions = StudySession.bulkCreate(japaneseRecords);

                return Promise.all([createEnglishStudySessions, createJapaneseStudySessions]);
            }).then(function() {
                return Promise.all([user.calculateStudySessionStatsForLanguage('en'), user.calculateStudySessionStatsForLanguage('ja')]);
            }).spread(function(e, j) {
                assert.equal(e.total_time_studied, englishStudyTime * numberOfStudySessions);
                assert.equal(j.total_time_studied, (japaneseStudyTime * numberOfStudySessions) - japaneseStudyTime);
            });
        });

        it(`should return the total number of study sessions for the specified language only`, function() {
            const englishStudyTime              = 300;
            const japaneseStudyTime             = 420;
            const numberOfEnglishStudySessions  = 5;
            const numberOfJapaneseStudySessions = 7;

            const englishVideoPromise = Video.findOne({
                attributes: [k.Attr.Id],
                where: {language_id: englishLanguageId}
            });

            const japaneseVideoPromise = Video.findOne({
                attributes: [k.Attr.Id],
                where: {language_id: japaneseLanguageId}
            });

            return Promise.all([englishVideoPromise, japaneseVideoPromise]).spread(function(englishVideo, japaneseVideo) {
                const englishRecords = _.times(numberOfEnglishStudySessions, function(i) {
                    return {
                        video_id: englishVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: englishStudyTime,
                        is_completed: true
                    }
                });

                const japaneseRecords = _.times(numberOfJapaneseStudySessions, function(i) {
                    return {
                        video_id: japaneseVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: japaneseStudyTime,
                        is_completed: true
                    }
                });

                _.set(_.first(englishRecords), 'is_completed', false);

                const createEnglishStudySessions  = StudySession.bulkCreate(englishRecords);
                const createJapaneseStudySessions = StudySession.bulkCreate(japaneseRecords);

                return Promise.all([createEnglishStudySessions, createJapaneseStudySessions]);
            }).then(function() {
                return Promise.all([user.calculateStudySessionStatsForLanguage('en'), user.calculateStudySessionStatsForLanguage('ja')]);
            }).spread(function(e, j) {
                assert.equal(e.total_study_sessions, numberOfEnglishStudySessions - 1);
                assert.equal(j.total_study_sessions, numberOfJapaneseStudySessions);
            });
        });

        it(`should return 0 if the user has not studied before`, function() {
            return user.calculateStudySessionStatsForLanguage('en').then(function(stats) {
                assert.equal(stats.total_time_studied, 0);
            });
        });

        it(`should return 0 if the user has not studied before`, function() {
            return user.calculateStudySessionStatsForLanguage('ja').then(function(stats) {
                assert.equal(stats.total_study_sessions, 0);
            });
        });
    });

    describe('calculateWritingStatsForLanguage', function() {
        it(`should throw a ReferenceError if no 'lang' is provided`, function() {
            assert.throws(function() {
                user.calculateWritingStatsForLanguage();
            }, ReferenceError);
        });

        it(`should throw a TypeError if the 'lang' argument is not a valid lang code`, function() {
            assert.throws(function() {
                user.calculateWritingStatsForLanguage('invalid');
            }, TypeError);
        });

        it(`should return the maximum number of words the user has written in a single study session for the specified language`, function() {
            const studyTime             = 300;
            const numberOfStudySessions = 2;

            const englishVideoPromise  = Video.findOne({attributes: [k.Attr.Id], where: {language_id: englishLanguageId}});
            const japaneseVideoPromise = Video.findOne({attributes: [k.Attr.Id], where: {language_id: japaneseLanguageId}});

            return Promise.join(englishVideoPromise, japaneseVideoPromise, function(englishVideo, japaneseVideo) {
                const englishRecords = _.times(numberOfStudySessions, function(i) {
                    return {
                        video_id: englishVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        is_completed: true
                    }
                });

                const japaneseRecords = _.times(numberOfStudySessions, function(i) {
                    return {
                        video_id: japaneseVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        is_completed: true
                    }
                });

                _.set(_.last(japaneseRecords), 'is_completed', false);

                const createEnglishStudySessions  = StudySession.bulkCreate(englishRecords);
                const createJapaneseStudySessions = StudySession.bulkCreate(japaneseRecords);

                return Promise.all([createEnglishStudySessions, createJapaneseStudySessions, WritingQuestion.findOne()]);
            }).spread(function(englishStudySessions, japaneseStudySessions, writingQuestion) {
                const writingQuestionId = writingQuestion.get(k.Attr.Id);
                const word = _.constant('word ');

                const englishAnswer_1 = {
                    answer: _.times(100, word).join(''),
                    study_session_id: _.first(englishStudySessions).get(k.Attr.Id),
                    words_per_minute: 20,
                    word_count: 100,
                    writing_question_id: writingQuestionId
                };

                const englishAnswer_2 = _.assign(_.clone(englishAnswer_1), {
                    answer: _.times(200, word).join(''),
                    study_session_id: _.nth(englishStudySessions, 1).get(k.Attr.Id),
                    words_per_minute: 40,
                    word_count: 200
                });

                const japaneseAnswer_1 = {
                    answer: _.times(300, word).join(''),
                    study_session_id: _.first(japaneseStudySessions).get(k.Attr.Id),
                    words_per_minute: 60,
                    word_count: 300,
                    writing_question_id: writingQuestionId
                };

                const japaneseAnswer_2 = _.assign(_.clone(japaneseAnswer_1), {
                    answer: _.times(400, word).join(''),
                    study_session_id: _.nth(japaneseStudySessions, 1).get(k.Attr.Id),
                    words_per_minute: 80,
                    word_count: 400
                });

                return WritingAnswer.bulkCreate([
                    englishAnswer_1, englishAnswer_2, japaneseAnswer_1, japaneseAnswer_2
                ]);
            }).then(function() {
                return Promise.all([user.calculateWritingStatsForLanguage('en'), user.calculateWritingStatsForLanguage('ja')]);
            }).spread(function(e, j) {
                assert.equal(e.maximum_words, 200, 'English');
                assert.equal(j.maximum_words, 300, 'Japanese');
            });
        });

        it(`should return the WPM of the writing answer in the specified language with the most words for the user`, function() {
            const englishVideoPromise = Video.findOne({
                attributes: [k.Attr.Id],
                where: {language_id: englishLanguageId}
            });

            const japaneseVideoPromise = Video.findOne({
                attributes: [k.Attr.Id],
                where: {language_id: japaneseLanguageId}
            });

            return Promise.join(englishVideoPromise, japaneseVideoPromise, function(englishVideo, japaneseVideo) {
                const englishRecords = _.times(2, function(i) {
                    return {
                        video_id: englishVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        is_completed: true
                    }
                });

                const japaneseRecords = _.times(2, function(i) {
                    return {
                        video_id: japaneseVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        is_completed: true
                    }
                });

                _.set(_.nth(englishRecords, 1), 'is_completed', false);

                const createEnglishStudySessions  = StudySession.bulkCreate(englishRecords);
                const createJapaneseStudySessions = StudySession.bulkCreate(japaneseRecords);

                return Promise.all([createEnglishStudySessions, createJapaneseStudySessions, WritingQuestion.findOne()]);
            }).spread(function(englishStudySessions, japaneseStudySessions, writingQuestion) {
                const writingQuestionId = writingQuestion.get(k.Attr.Id);
                const word = _.constant('word ');

                const englishAnswer_1 = {
                    answer: _.times(100, word).join(''),
                    study_session_id: _.first(englishStudySessions).get(k.Attr.Id),
                    words_per_minute: 20,
                    word_count: 100,
                    writing_question_id: writingQuestionId
                };

                const englishAnswer_2 = _.assign(_.clone(englishAnswer_1), {
                    answer: _.times(200, word).join(''),
                    study_session_id: _.nth(englishStudySessions, 1).get(k.Attr.Id),
                    words_per_minute: 40,
                    word_count: 200
                });

                const japaneseAnswer_1 = {
                    answer: _.times(300, word).join(''),
                    study_session_id: _.first(japaneseStudySessions).get(k.Attr.Id),
                    words_per_minute: 60,
                    word_count: 300,
                    writing_question_id: writingQuestionId
                };

                const japaneseAnswer_2 = _.assign(_.clone(japaneseAnswer_1), {
                    answer: _.times(400, word).join(''),
                    study_session_id: _.nth(japaneseStudySessions, 1).get(k.Attr.Id),
                    words_per_minute: 80,
                    word_count: 400
                });

                return WritingAnswer.bulkCreate([englishAnswer_1, englishAnswer_2, japaneseAnswer_1, japaneseAnswer_2]);
            }).then(function() {
                return Promise.all([user.calculateWritingStatsForLanguage('en'), user.calculateWritingStatsForLanguage('ja')]);
            }).spread(function(e, j) {
                assert.equal(e.maximum_wpm, 20, 'English');
                assert.equal(j.maximum_wpm, 80, 'Japanese');
            });
        });

        it(`should return 0 WPM if the user has not studied before`, function() {
            return user.calculateWritingStatsForLanguage('en').then(function(stats) {
                assert.equal(stats.maximum_wpm, 0);
            });
        });

        it(`should return 0 as the maximum number of words if the user has not studied before`, function() {
            return user.calculateWritingStatsForLanguage('en').then(function(stats) {
                assert.equal(stats.maximum_words, 0);
            });
        });
    });

    describe('calculateStudyStreaks', function() {
        it(`should throw a ReferenceError if no 'lang' is provided`, function() {
            assert.throws(function() {
                user.calculateStudyStreaksForLanguage();
            }, ReferenceError);
        });

        it(`should throw a TypeError if the 'lang' argument is not a valid lang code`, function() {
            assert.throws(function() {
                user.calculateStudyStreaksForLanguage('invalid');
            }, TypeError);
        });

        it(`should return the longest number of consecutive days the user has studied for the specified language`, function() {
            const japaneseVideoPromise = Video.findOne({attributes: [k.Attr.Id], where: {language_id: japaneseLanguageId}});
            const englishVideoPromise  = Video.findOne({attributes: [k.Attr.Id], where: {language_id: englishLanguageId}});

            return Promise.join(japaneseVideoPromise, englishVideoPromise, function(japaneseVideo, englishVideo) {
                const englishStudyDates = [
                    '2017-03-13 00:00:00',
                    '2017-03-10 00:00:00',
                    '2017-03-09 00:00:00',
                    '2017-03-08 00:00:00',
                    '2017-03-07 00:00:00',
                    '2017-03-05 00:00:00',
                    '2017-03-02 00:00:00',
                    '2017-03-01 00:00:00'
                ];

                const japaneseStudyDates = [
                    '2017-03-08 00:00:00',
                    '2017-03-07 00:00:00',
                    '2017-03-06 00:00:00',
                    '2017-03-05 00:00:00',
                    '2017-03-04 00:00:00',
                    '2017-03-03 00:00:00',
                    '2017-03-02 00:00:00',
                    '2017-03-01 00:00:00'
                ];

                const englishStudySessions = _.times(englishStudyDates.length, function(i) {
                    return {
                        video_id: englishVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        created_at: englishStudyDates[i],
                        is_completed: true
                    }
                });

                const japaneseStudySessions = _.times(japaneseStudyDates.length, function(i) {
                    return {
                        video_id: japaneseVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        created_at: japaneseStudyDates[i],
                        is_completed: true
                    }
                });

                _.nth(japaneseStudySessions, 6)[k.Attr.IsCompleted] = false;

                return StudySession.bulkCreate(_.concat(englishStudySessions, japaneseStudySessions));
            }).then(function() {
                return Promise.all([user.calculateStudyStreaksForLanguage('en'), user.calculateStudyStreaksForLanguage('ja')]);
            }).spread(function(englishStats, japaneseStats) {
                assert.equal(englishStats.longest_consecutive_days, 4, '(English)');
                assert.equal(japaneseStats.longest_consecutive_days, 6, '(Japanese)');
            });
        });

        it(`should return the number of days the user has consecutively studied for the specified language`, function() {
            const japaneseVideoPromise = Video.findOne({attributes: [k.Attr.Id], where: {language_id: japaneseLanguageId}});
            const englishVideoPromise  = Video.findOne({attributes: [k.Attr.Id], where: {language_id: englishLanguageId}});

            return Promise.join(japaneseVideoPromise, englishVideoPromise, function(japaneseVideo, englishVideo) {
                const oneDay             = 1000 * 60 * 60 * 24;
                const now                = new Date();
                const yesterday          = new Date(now - oneDay);
                const dayBeforeYesterday = new Date(now - (oneDay * 2));

                const englishStudyDates = [
                    now, yesterday, dayBeforeYesterday, '2017-03-05 00:00:00', '2017-03-02 00:00:00', '2017-03-01 00:00:00'
                ];

                const japaneseStudyDates = [
                    now, '2017-03-05 00:00:00', '2017-03-02 00:00:00', '2017-03-01 00:00:00'
                ];

                const englishStudySessions = _.times(englishStudyDates.length, function(i) {
                    return {
                        video_id: englishVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        created_at: englishStudyDates[i],
                        is_completed: true
                    }
                });

                _.nth(englishStudySessions, 2).is_completed = false;

                const japaneseStudySessions = _.times(japaneseStudyDates.length, function(i) {
                    return {
                        video_id: japaneseVideo[k.Attr.Id],
                        user_id: user[k.Attr.Id],
                        study_time: 300,
                        created_at: japaneseStudyDates[i],
                        is_completed: true
                    }
                });

                return StudySession.bulkCreate(_.concat(englishStudySessions, japaneseStudySessions));
            }).then(function() {
                return Promise.all([user.calculateStudyStreaksForLanguage('en'), user.calculateStudyStreaksForLanguage('ja')]);
            }).spread(function(englishStats, japaneseStats) {
                assert.equal(englishStats.consecutive_days, 2, '(English)');
                assert.equal(japaneseStats.consecutive_days, 1, '(Japanese)');
            });
        });

        it(`should return 0 as the current streak if the user has not studied before`, function() {
            return user.calculateStudyStreaksForLanguage('en').then(function(stats) {
                assert.equal(stats.consecutive_days, 0);
            });
        });

        it(`should return 0 as the longest streak if the user has not studied before`, function() {
            return user.calculateStudyStreaksForLanguage('en').then(function(stats) {
                assert.equal(stats.longest_consecutive_days, 0);
            });
        });
    });
});