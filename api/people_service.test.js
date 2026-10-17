const fs = require('fs');
const os = require('os');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const defineUser = require('../models/user');
const definePerson = require('../models/person');
const defineWatchable = require('../models/watchable');
const defineWatchablePerson = require('../models/watchable_person');
const peopleService = require('./people_service');

describe('people_service', () => {
  let sequelize;
  let models;
  let tmpDir;
  let originalPeopleDir;

  beforeAll(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const User = defineUser(sequelize, DataTypes);
    const Person = definePerson(sequelize, DataTypes);
    const Watchable = defineWatchable(sequelize, DataTypes);
    const WatchablePerson = defineWatchablePerson(sequelize, DataTypes);
    models = {
      sequelize, User, Person, Watchable, WatchablePerson,
    };
    // Skip User.associate (needs UserStreamingAccess); wire People/Watchable M2M only.
    Person.belongsTo(User, { foreignKey: 'userId' });
    Watchable.belongsToMany(Person, {
      through: WatchablePerson,
      foreignKey: 'watchableId',
      otherKey: 'personId',
      as: 'recommenders',
    });
    Person.belongsToMany(Watchable, {
      through: WatchablePerson,
      foreignKey: 'personId',
      otherKey: 'watchableId',
      as: 'watchables',
    });
    await sequelize.sync();

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'people-avatars-'));
    originalPeopleDir = peopleService.getPeopleImageDir();
    peopleService.setPeopleImageDir(tmpDir);
  });

  afterAll(async () => {
    peopleService.setPeopleImageDir(originalPeopleDir);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await sequelize.close();
  });

  beforeEach(async () => {
    await models.WatchablePerson.destroy({ where: {} });
    await models.Person.destroy({ where: {} });
    await models.Watchable.destroy({ where: {} });
    await models.User.destroy({ where: {} });
    for (const f of fs.readdirSync(tmpDir)) {
      fs.unlinkSync(path.join(tmpDir, f));
    }
  });

  async function seedUsers() {
    const userA = await models.User.create({ username: 'alice' });
    const userB = await models.User.create({ username: 'bob' });
    return { userA, userB };
  }

  it('createPerson and listPeopleForUser are scoped to user', async () => {
    const { userA, userB } = await seedUsers();
    await peopleService.createPerson(models, userA.id, { name: 'Sam' });
    await peopleService.createPerson(models, userB.id, { name: 'Pat' });
    const listA = await peopleService.listPeopleForUser(models, userA.id);
    expect(listA).toHaveLength(1);
    expect(listA[0].name).toBe('Sam');
    expect(listA[0].avatarUrl).toBeNull();
  });

  it('rejects empty name', async () => {
    const { userA } = await seedUsers();
    await expect(peopleService.createPerson(models, userA.id, { name: '  ' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('updatePerson returns null for other user', async () => {
    const { userA, userB } = await seedUsers();
    const created = await peopleService.createPerson(models, userA.id, { name: 'Sam' });
    const updated = await peopleService.updatePerson(models, userB.id, created.id, { name: 'X' });
    expect(updated).toBeNull();
  });

  it('stores external avatarUrl', async () => {
    const { userA } = await seedUsers();
    const created = await peopleService.createPerson(models, userA.id, {
      name: 'Sam',
      avatarUrl: 'https://example.com/sam.jpg',
    });
    expect(created.avatarUrl).toBe('https://example.com/sam.jpg');
  });

  it('setWatchablePeople replaces joins and rejects foreign personIds', async () => {
    const { userA, userB } = await seedUsers();
    const sam = await peopleService.createPerson(models, userA.id, { name: 'Sam' });
    const pat = await peopleService.createPerson(models, userA.id, { name: 'Pat' });
    const foreign = await peopleService.createPerson(models, userB.id, { name: 'Other' });
    const watchable = await models.Watchable.create({
      title: 'Film',
      trakt_list_id: '1',
    });

    await peopleService.setWatchablePeople(models, watchable.id, [sam.id], userA.id);
    let joins = await models.WatchablePerson.findAll({ where: { watchableId: watchable.id } });
    expect(joins.map((j) => j.personId)).toEqual([sam.id]);

    await peopleService.setWatchablePeople(models, watchable.id, [sam.id, pat.id], userA.id);
    joins = await models.WatchablePerson.findAll({ where: { watchableId: watchable.id } });
    expect(joins.map((j) => j.personId).sort()).toEqual([sam.id, pat.id].sort());

    await expect(
      peopleService.setWatchablePeople(models, watchable.id, [foreign.id], userA.id),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('deletePerson removes join rows', async () => {
    const { userA } = await seedUsers();
    const sam = await peopleService.createPerson(models, userA.id, { name: 'Sam' });
    const watchable = await models.Watchable.create({ title: 'Film', trakt_list_id: '1' });
    await peopleService.setWatchablePeople(models, watchable.id, [sam.id], userA.id);
    const ok = await peopleService.deletePerson(models, userA.id, sam.id);
    expect(ok).toBe(true);
    expect(await models.Person.count()).toBe(0);
    expect(await models.WatchablePerson.count()).toBe(0);
  });

  it('savePersonAvatarFile writes local file and resolveAvatarUrl uses /api/img/people/:id', async () => {
    const { userA } = await seedUsers();
    const sam = await peopleService.createPerson(models, userA.id, { name: 'Sam' });
    const dest = path.join(tmpDir, `${sam.id}.jpg`);

    const result = await peopleService.savePersonAvatarFile(models, userA.id, sam.id, {
      buffer: Buffer.from('fake-jpeg'),
      mimetype: 'image/jpeg',
      size: 9,
    });
    expect(result.avatarUrl).toBe(`/api/img/people/${sam.id}`);
    expect(fs.existsSync(dest)).toBe(true);
  });

  it('watchableToBrowseJson emits snake_case recommenders', () => {
    const json = peopleService.watchableToBrowseJson({
      toJSON: () => ({
        id: 1,
        title: 'X',
        recommenders: [{ id: 2, name: 'Sam', avatar: 'https://example.com/a.jpg' }],
      }),
    });
    expect(json.recommenders).toEqual([
      { id: 2, name: 'Sam', avatar_url: 'https://example.com/a.jpg' },
    ]);
  });
});
