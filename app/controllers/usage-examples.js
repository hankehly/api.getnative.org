/**
 * usage-examples
 * api.get-native.com
 *
 * Created by henryehly on 2017/07/13.
 */

const db = require('../models');
const k = require('../../config/keys.json');
const GetNativeError = require('../services/get-native-error');

const _ = require('lodash');

module.exports.update = async (req, res, next) => {
    if (_.size(req.body) === 0) {
        return res.sendStatus(304);
    }

    let updateCount;

    try {
        [updateCount] = await db[k.Model.UsageExample].update(req.body, {
            where: {
                id: req.params[k.Attr.Id]
            }
        });
    } catch (e) {
        return next(e);
    }

    if (updateCount === 0) {
        res.status(404);
        return next(new GetNativeError(k.Error.ResourceNotFound));
    }

    return res.sendStatus(204);
};