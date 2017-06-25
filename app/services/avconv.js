/**
 * avconv
 * api.get-native.com
 *
 * Created by henryehly on 2017/05/29.
 */

const randomHash = require('./auth').generateRandomHash;

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const _ = require('lodash');

function validateFilepath(filepath) {
    if (!filepath) {
        throw new ReferenceError('argument filepath is missing');
    }

    if (!_.isString(filepath)) {
        throw new TypeError('argument filepath must be a string');
    }
}

module.exports.videoToFlac = async function(filepath) {
    validateFilepath(filepath);

    const outputFilePath = '/tmp/' + randomHash() + '.flac';
    await exec(`/usr/bin/env avconv -y -i ${filepath} -vn -f flac ${outputFilePath} >/dev/null 2>&1`);
    return outputFilePath;
};

module.exports.getDimensionsOfVideoAtPath = async function(filepath) {
    validateFilepath(filepath);

    const {stdout} = await exec(`/usr/bin/env avconv -i ${filepath} 2>&1 | cat`);
    const size = _.first(stdout.match(/[0-9]{2,}x[0-9]+/));
    const [width, height] = _.map(_.split(size, 'x'), _.toNumber);

    return {
        width: width,
        height: height
    };
};

module.exports.cropVideoToSize = async function(filepath, cropSize) {
    validateFilepath(filepath);

    if (!cropSize) {
        throw new ReferenceError('argument cropSize is undefined');
    }

    if (!_.isNumber(cropSize.width) || !_.isNumber(cropSize.height)) {
        throw new TypeError('argument cropSize.{width,height} must be present');
    }

    if (_.lt(cropSize.width, 1) || _.lt(cropSize.height, 1)) {
        throw new TypeError('argument cropSize.{width,height} must have values greater than or equal to 1');
    }

    const outputFilePath = '/tmp/' + randomHash() + '.mp4';
    await exec(`avconv -y -i ${filepath} -vf "crop=${cropSize.width}:${cropSize.height}" -f mp4 ${outputFilePath}`);

    return outputFilePath;
};
