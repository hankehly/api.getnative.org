/**
 * 20170224015734-create-likes
 * api.get-native.com
 *
 * Created by henryehly on 2017/02/24.
 */

module.exports = {
    up: function(queryInterface, Sequelize) {
        return queryInterface.createTable('likes', {
            video_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'videos',
                    key: 'id'
                },
                onUpdate: 'restrict',
                onDelete: 'restrict',
                primaryKey: true
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'restrict',
                onDelete: 'restrict',
                primaryKey: true
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('NOW')
            }
        }, {
            engine: 'InnoDB',
            charset: 'utf8mb4'
        });
    },

    down: function(queryInterface, Sequelize) {
        return queryInterface.dropTable('likes');
    }
};