const express = require("express");
const {
  registerSuperAdmin,
  loginSuperAdmin,
  getSuperAdminProfile,
  getSuperAdminList,
  getInstitutionSettings,
  updateInstitutionSettings,
  changePassword,
} = require("./SuperAdminController");
const {
  protectSuperAdmin,
} = require("./SuperAdminMiddleware");

const router = express.Router();

router.post("/register", registerSuperAdmin);
router.post("/login", loginSuperAdmin);
router.post("/profile", protectSuperAdmin, getSuperAdminProfile);
router.post("/list", protectSuperAdmin, getSuperAdminList);

router.get("/settings/institution", protectSuperAdmin, getInstitutionSettings);
router.put("/settings/institution", protectSuperAdmin, updateInstitutionSettings);
router.put("/settings/change-password", protectSuperAdmin, changePassword);

module.exports = router;
