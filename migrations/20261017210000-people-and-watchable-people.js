/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('People', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      avatar: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('People', ['userId'], {
      name: 'people_user_id',
    });

    await queryInterface.createTable('WatchablePeople', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      watchableId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Watchables', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      personId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'People', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('WatchablePeople', ['watchableId', 'personId'], {
      unique: true,
      name: 'watchable_people_watchable_person_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('WatchablePeople');
    await queryInterface.dropTable('People');
  },
};
