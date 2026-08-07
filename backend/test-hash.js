import bcrypt from 'bcryptjs'; // 👈 Swapped from 'bcrypt' to 'bcryptjs'

const plainPassword = 'Clinician@123';

bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }
    console.log("--------------------------------------------------");
    console.log("YOUR CUSTOM BACKEND HASH IS:");
    console.log(hash);
    console.log("--------------------------------------------------");
});