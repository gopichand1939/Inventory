const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    createSuperAdmin,
    findSuperAdminByEmail,
    findSuperAdminById,
    getRegisteredSuperAdminList,
} = require("./SuperAdminModel");
const {
    createUserCredential,
    findUserCredentialByEmail,
} = require("../Auth/AuthModel");

const createToken = (superAdmin) => {
    const payload = {
        id: superAdmin.id,
        email: superAdmin.email,
        role: "super_admin",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    return token;
};

const registerSuperAdmin = async (req, res) => {
    try {
        const {
            institution_id,
            pg_admin_id,
            name,
            email,
            phone,
            password,
        } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();

        if (!name || !normalizedEmail || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const existingCredential = await findUserCredentialByEmail(
            normalizedEmail
        );

        if (existingCredential) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        const oldSuperAdmin = await findSuperAdminByEmail(normalizedEmail);

        if (oldSuperAdmin) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const superAdmin = await createSuperAdmin(
            name,
            normalizedEmail,
            phone,
            hashedPassword,
            institution_id,
            pg_admin_id
        );

        await createUserCredential({
            email: normalizedEmail,
            password: hashedPassword,
            role: "super_admin",
            institution_id,
            super_admin_id: superAdmin.id,
        });

        const token = createToken(superAdmin);

        return res.status(201).json({
            success: true,
            message: "Super admin registered successfully",
            token,
            user: {
                ...superAdmin,
                role: "super_admin",
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed",
        });
    }
};

const loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const superAdmin = await findSuperAdminByEmail(email);

        if (!superAdmin) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            superAdmin.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = createToken(superAdmin);

        const userData = {
            id: superAdmin.id,
            institution_id: superAdmin.institution_id,
            pg_admin_id: superAdmin.pg_admin_id,
            name: superAdmin.name,
            email: superAdmin.email,
            phone: superAdmin.phone,
            role: "super_admin",
            created_at: superAdmin.created_at,
        };

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: userData,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};

const getSuperAdminProfile = async (req, res) => {
    try {
        const superAdmin = await findSuperAdminById(req.user.id);

        if (!superAdmin) {
            return res.status(404).json({
                success: false,
            message: "Super admin not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            user: {
                ...superAdmin,
                role: "super_admin",
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Profile failed",
        });
    }
};

const getSuperAdminList = async (req, res) => {
    try {
        const users = await getRegisteredSuperAdminList();

        return res.status(200).json({
            success: true,
            message: "Super admin list fetched successfully",
            users,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Super admin list failed",
        });
    }
};

const { query } = require("../Config/Database");

const getInstitutionSettings = async (req, res) => {
    try {
        const result = await query("SELECT * FROM institutions WHERE id = 1");
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Institution not found" });
        }
        return res.status(200).json({ success: true, institution: result.rows[0] });
    } catch (error) {
        console.error("Failed to fetch institution settings:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch settings" });
    }
};

const updateInstitutionSettings = async (req, res) => {
    try {
        const { institution_name, email, phone, address, city, state, pincode } = req.body;
        
        await query(
            "UPDATE institutions SET institution_name = $1, email = $2, phone = $3, address = $4, city = $5, state = $6, pincode = $7 WHERE id = 1",
            [institution_name, email, phone, address, city, state, pincode]
        );
        
        return res.status(200).json({ success: true, message: "Institution settings updated successfully" });
    } catch (error) {
        console.error("Failed to update institution settings:", error);
        return res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};

const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: "Current and new passwords are required" });
        }

        const credRes = await query("SELECT * FROM user_credentials WHERE super_admin_id = $1", [req.user.id]);
        if (credRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User credentials not found" });
        }
        
        const credential = credRes.rows[0];
        
        const isPasswordValid = await bcrypt.compare(current_password, credential.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid current password" });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        
        await query("UPDATE user_credentials SET password = $1 WHERE super_admin_id = $2", [hashedPassword, req.user.id]);
        await query("UPDATE super_admins SET password = $1 WHERE id = $2", [hashedPassword, req.user.id]);
        
        return res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Failed to update password:", error);
        return res.status(500).json({ success: false, message: "Failed to update password" });
    }
};

module.exports = {
    registerSuperAdmin,
    loginSuperAdmin,
    getSuperAdminProfile,
    getSuperAdminList,
    getInstitutionSettings,
    updateInstitutionSettings,
    changePassword,
};
