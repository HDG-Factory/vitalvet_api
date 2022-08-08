import { sequelize } from "../database/connectdb.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";

// One-to-one relationship between User and Profile with foreign key 'user_id' in profile
User.hasOne(Profile, { foreignKey: "user_id", onDelete: "CASCADE", onUpdate: "CASCADE" });




// Ensure that the tables are created in the database
await sequelize.sync();

// Create default instances

(async () => {
    const userAdminExists = await User.findOne({ where: { email: "adminUser" } });

    if (userAdminExists)
        return;

    const profileAdminExists = await Profile.findOne({ where: { admin: true } });

    if (profileAdminExists)
        return;

    const adminUser = await User.create({ email: "admin@user.com", password: "adminUserWithPassword#123" });
    await Profile.create({
        name: "Fernando",
        lastname: "Salazar",
        birthday: "2020-01-01",
        picture: "http://www.example.com/image.png",
        admin: true,
        college: "Universidad Nacional de Colombia",
        review: "Lorem ipsum dolor sit amet, consectetur",
        user_id: adminUser.id
    });
})();