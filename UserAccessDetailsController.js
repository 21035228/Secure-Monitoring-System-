const AccessUserDetailsModel = require('../modules/UserDetailsModules')
const bcrypt = require("bcrypt");
const AccessOTPModel = require('../modules/OTPModules');
const AccessLogModel = require('../modules/LogModules');
const createUniversalTransporter = require('../config/createUniversalTransporter');

async function fnRemoveObj(array) {
  // sanitize response (remove password field)
  const sanitizedData = array.map(driver => {
    const obj = driver.toObject();
    delete obj.password;
    delete obj.Address;
    delete obj.accountNo;
    delete obj.AdtharNO;
    delete obj.createdAt;
    delete obj.HR_ERCode;
    return obj;
  });
  return sanitizedData
}

function uniqueReadablePassword() {
  const words = [
    "Bin", "Eco", "Trash", "Green", "Waste",
    "Recycle", "Compost", "Landfill", "Garbage", "Paper",
    "Plastic", "Glass", "Metal", "Organic", "Energy",
    "Reduce", "Reuse", "Circular", "Bio", "Clean",
    "Sort", "Pickup", "Dump", "Tidy", "ZeroWaste"
  ];
  const randWord = words[Math.floor(Math.random() * words.length)];
  const randNum = Math.floor(100 + Math.random() * 9000); // 3–4 digits
  let password = `${randWord}${randNum}`;
  if (password.length > 12) {
    password = password.substring(0, 12);
  }
  return password;
}


function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

function mailSentOTPTemplate({ phoneNo, otp }) {
  const OTPTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OTP Verification - Earth Recycler</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 14px;
      padding: 40px 30px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      text-align: center;
    }
    .logo {
      width: 160px;
      margin-bottom: 25px;
    }
    h2 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #475569;
      font-size: 15px;
      line-height: 1.7;
      margin: 10px 0;
    }
    .otp-box {
      background: linear-gradient(135deg, #e9fbee, #d7f5e2);
      border-radius: 10px;
      font-size:32px;
      font-weight: bold;
      padding: 18px;
      margin: 20px 0;
      color: #166534;
      border: 1px solid #bde8c4;
      letter-spacing: 4px;
    }
    .note {
      background: #f8fafc;
      border-left: 4px solid #22c55e;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 6px;
      color: #334155;
      font-size: 14px;
      text-align: left;
    }
    .footer {
      margin-top: 35px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .social-icons {
      margin: 20px 0;
    }
    .social-icons img {
      width: 26px;
      margin: 0 6px;
      vertical-align: middle;
      opacity: 0.9;
      transition: opacity 0.3s;
    }
    .social-icons img:hover {
      opacity: 1;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Logo -->
    <img src="https://earthrecycler.com/_next/image?url=%2FEarth-Recycler-Logo.png&w=128&q=75" alt="Earth Recycler Logo" class="logo">

    <!-- Title -->
    <h2>Verify Your OTP</h2>
    <p>
      Use the verification code below to confirm your account.<br>
      Phone number: <strong>${phoneNo}</strong>
    </p>

    <!-- OTP Box -->
    <div class="otp-box">${otp}</div>

    <!-- Info Note -->
    <div class="note">
      If you did not request this verification, please ignore this email. <br>
      Your OTP will expire in <strong>5 minutes</strong>.
    </div>

    <hr>

    <!-- Footer Text -->
    <p style="font-size: 14px; color: #475569;">
      Earth Recycler — Give Life To Your Trash.
    </p>

    <!-- Social Icons -->
    <div class="social-icons">
      <a href="https://www.facebook.com/EarthRecycler/"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook"></a>
      <a href="https://www.instagram.com/earth_recycler?igsh=MTl2bmkydzgxcnF1OQ=="><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram"></a>
      <a href="https://www.youtube.com/@earthrecyclerprivatelimite6805"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube"></a>
      <a href="https://in.linkedin.com/company/earth-recycler-p-ltd"><img src="https://cdn-icons-png.flaticon.com/512/3536/3536505.png" alt="LinkedIn"></a>
    </div>

    <div class="footer">
      &copy; 2025 Earth Recycler. All rights reserved.<br>
      This email was sent for verification purposes only.
    </div>
  </div>
</body>
</html>
`
  return (OTPTemplate)
}

function welcomeMailTemplate({ password, userType }) {
  const OTPTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to Earth Recycler</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 14px;
      padding: 40px 30px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      text-align: center;
    }
    .logo {
      width: 160px;
      margin-bottom: 25px;
    }
    h2 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #475569;
      font-size: 15px;
      line-height: 1.7;
      margin: 10px 0;
    }
    .subtitle {
      color: #334155;
      font-size: 15px;
      margin-top: 10px;
    }
    .welcome-box {
      background: linear-gradient(135deg, #e9fbee, #d7f5e2);
      border-radius: 10px;
      font-size: 20px;
      font-weight: 600;
      padding: 18px;
      margin: 20px 0;
      color: #166534;
      border: 1px solid #bde8c4;
      letter-spacing: 1px;
    }
    .note {
      background: #f8fafc;
      border-left: 4px solid #22c55e;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 6px;
      color: #334155;
      font-size: 14px;
      text-align: left;
    }
    .footer {
      margin-top: 35px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .social-icons {
      margin: 20px 0;
    }
    .social-icons img {
      width: 26px;
      margin: 0 6px;
      vertical-align: middle;
      opacity: 0.9;
      transition: opacity 0.3s;
    }
    .social-icons img:hover {
      opacity: 1;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Logo -->
    <img src="https://earthrecycler.com/_next/image?url=%2FEarth-Recycler-Logo.png&w=128&q=75" alt="Earth Recycler Logo" class="logo">

    <!-- Title -->
    <h2>Welcome to Earth Recycler!</h2>
    <p>
      Welcome aboard! Let’s work together for a cleaner and greener planet.<br>
      Here is your password — please don’t share it:
    </p>

    <!-- Password Box -->
    <div class="welcome-box">
      ${password}
    </div>

    <div class="subtitle">This password is for ${userType} only.</div>

    <!-- Info Note -->
    <div class="note">
      You can now log in to access your ${userType} account, manage your team, and oversee waste collection operations efficiently.
    </div>

    <hr>

    <!-- Footer -->
    <p style="font-size: 14px; color: #475569;">
      Earth Recycler — Give Life To Your Trash.
    </p>

    <!-- Social Icons -->
    <div class="social-icons">
      <a href="https://www.facebook.com/EarthRecycler/"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook"></a>
      <a href="https://www.instagram.com/earth_recycler?igsh=MTl2bmkydzgxcnF1OQ=="><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram"></a>
      <a href="https://www.youtube.com/@earthrecyclerprivatelimite6805"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube"></a>
      <a href="https://in.linkedin.com/company/earth-recycler-p-ltd"><img src="https://cdn-icons-png.flaticon.com/512/3536/3536505.png" alt="LinkedIn"></a>
    </div>

    <div class="footer">
      &copy; 2025 Earth Recycler. All rights reserved.<br>
      You received this email because you are registered as a ${userType}.
    </div>
  </div>
</body>
</html>
`
  return (OTPTemplate)
}
function updateMailTemplate({ userType }) {
  const OTPTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account Update Notification</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 14px;
      padding: 40px 30px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .banner {
      width: 100%;
      border-radius: 14px 14px 0 0;
      margin-bottom: 25px;
    }
    .logo {
      width: 160px;
      margin-bottom: 15px;
    }
    h2 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #475569;
      font-size: 15px;
      line-height: 1.7;
      margin: 10px 0;
    }
    .subtitle {
      color: #334155;
      font-size: 15px;
      margin-top: 10px;
    }
    .note {
      background: #f8fafc;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 6px;
      color: #334155;
      font-size: 14px;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .note img {
      width: 28px;
      height: 28px;
    }
    .footer {
      margin-top: 35px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .social-icons {
      margin: 20px 0;
    }
    .social-icons img {
      width: 26px;
      margin: 0 6px;
      vertical-align: middle;
      opacity: 0.9;
      transition: opacity 0.3s;
    }
    .social-icons img:hover {
      opacity: 1;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- Logo -->
    <img src="https://earthrecycler.com/_next/image?url=%2FEarth-Recycler-Logo.png&w=128&q=75" alt="Earth Recycler Logo" class="logo">

    <!-- Title -->
    <h2>Your Earth Recycler Account Has Been Updated</h2>
    <p>
      Your account details have been successfully updated.<br>
      You can now log in to access your ${userType} account and manage your operations efficiently.
    </p>

    <!-- Note with illustration -->
    <div class="note">
      <img src="https://cdn-icons-png.flaticon.com/512/869/869636.png" alt="Info Icon">
      If you did not request this change, please contact support immediately to secure your account.
    </div>

    <hr>

    <!-- Footer -->
    <p style="font-size: 14px; color: #475569;">
      Earth Recycler — Give Life To Your Trash.
    </p>

    <!-- Social Icons -->
    <div class="social-icons">
      <a href="https://www.facebook.com/EarthRecycler/"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook"></a>
      <a href="https://www.instagram.com/earth_recycler?igsh=MTl2bmkydzgxcnF1OQ=="><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram"></a>
      <a href="https://www.youtube.com/@earthrecyclerprivatelimite6805"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" alt="YouTube"></a>
      <a href="https://in.linkedin.com/company/earth-recycler-p-ltd"><img src="https://cdn-icons-png.flaticon.com/512/3536/3536505.png" alt="LinkedIn"></a>
    </div>

    <div class="footer">
      &copy; 2025 Earth Recycler. All rights reserved.<br>
      You received this email because you are registered as a ${userType}.
    </div>
  </div>
</body>
</html>
`
  return (OTPTemplate)
}

exports.CreateUserSendOTP = async (req, res, next) => {
  try {
    const requestData = req.body;

    const validateUser = await AccessUserDetailsModel.findOne({ _id: requestData.employeeId })
    if (!validateUser) {
      return res.json({
        success: false,
        isLogout: true,
        errormsg: "User information not found.",
      });
    }

    const validateEmail = await AccessUserDetailsModel.findOne({ mailID: requestData.mailID });
    if (validateEmail) {
      return res.json({
        success: false,
        errormsg: "EmailID already registered",
      });
    }

    // check if phone exists
    const validatePhoneno = await AccessUserDetailsModel.findOne({ phoneNo: requestData.phoneNo });
    if (validatePhoneno) {
      return res.json({
        success: false,
        errormsg: "Phone number already registered",
      });
    }

    const otp = generateOTP();

    await AccessOTPModel.deleteMany({ employeeId: requestData.employeeId, mailID: requestData.mailID });


    await AccessOTPModel.create({ employeeId: requestData.employeeId, OTP: otp, mailID: requestData.mailID });

    let transporter = createUniversalTransporter();
    const _getParams = {
      phoneNo: requestData.phoneNo,
      otp,
    }
    const OTPTemplate = mailSentOTPTemplate(_getParams);
    let mailOptions = {
      from: 'Sample mail',
      to: requestData.mailID,
      subject: `Your Signup OTP Code`,
      html: OTPTemplate,
    };
    // --- SEND EMAIL ---
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(" Email sent successfully:", info.response);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);
      return res.json({
        success: false,
        errormsg:
          "Failed to send OTP email. Please verify your email address or try again later.",
      });
    }
    return res.json({
      success: true,
      errormsg: `Signup OTP sended successfully`,
    });

  } catch (err) {
    console.dir(err)
    res.json({
      success: false,
      errormsg: err.message || "Something went wrong",
    });
  }
}

exports.CreateUserVerifyOTP = async (req, res, next) => {
  try {
    const requestData = req.body;

    const validateUser = await AccessUserDetailsModel.findOne({ _id: requestData.employeeId })
    if (!validateUser) {
      return res.json({
        success: false,
        isLogout: true,
        errormsg: "User information not found.",
      });
    }

    const record = await AccessOTPModel.findOne({ employeeId: requestData.employeeId, OTP: requestData.OTP, mailID: requestData.mailID })

    if (!record) {
      return res.json({
        success: false,
        errormsg: "Invalid or expired OTP"
      });
    }

    await AccessOTPModel.deleteOne({ _id: record._id });

    const validateUserMailID = await AccessUserDetailsModel.findOne({
      mailID: requestData.mailID
    });
    const validateUserPhoneNo = await AccessUserDetailsModel.findOne({
      phoneNo: requestData.phoneNo
    });

    if (validateUserMailID) {
      return res.json({
        success: false,
        errormsg: "Email Id Already Registered",
      });
    }
    if (validateUserPhoneNo) {
      return res.json({
        success: false,
        errormsg: "Phone no Already Registered",
      });
    }


    let userData = {
      userName: requestData.userName,
      mailID: requestData.mailID,
      phoneNo: requestData.phoneNo,
      gender: requestData.gender,
    }

    //set password if not Field staff
    const password = uniqueReadablePassword();

    // hash password before insert
    const hashedPassword = await bcrypt.hash(password, 10);
    userData.password = hashedPassword;

    let transporter = createUniversalTransporter();
    const _getParams = {
      userType: requestData.userType,
      password: password,
    };

    const Template = welcomeMailTemplate(_getParams);

    // Email content
    let mailOptions = {
      from: '"Earth Recycler Pvt Ltd" <earthrecyclerpvtltd@gmail.com>',
      to: requestData.mailID,
      subject: `Welcome to Earth Recycler`,
      html: Template,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(" Email sent successfully:", info.response);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);
      return res.json({
        success: false,
        errormsg:
          "Failed to send OTP email. Please verify your email address or try again later.",
      });
    }


    const newUser = await AccessUserDetailsModel.create(userData);

    await AccessLogModel.create({
      referDocId: newUser._id,
      EmployeeId: requestData.employeeId,
      ModuleName: "UserDetails",
      Sts: "Add",
    });

    res.json({
      success: true,
      errormsg: "User added successfully",
    });

  } catch (err) {
    console.dir(err)
    res.json({
      success: false,
      errormsg: err.message || "Something went wrong",
    });
  }
}

exports.UpdateUserSendOTP = async (req, res, next) => {
  try {
    const { _id, employeeId, ...requestData } = req.body;

    const validateUser = await AccessUserDetailsModel.findOne({ _id: employeeId })
    if (!validateUser) {
      return res.json({
        success: false,
        isLogout: true,
        errormsg: "User information not found.",
      });
    }

    // check if email exists
    const validateEmail = await AccessUserDetailsModel.findOne({ mailID: requestData.mailID, _id: { $ne: _id } });
    if (validateEmail) {
      return res.json({
        success: false,
        errormsg: "EmailID already registered",
      });
    }

    // check if phone exists
    const validatePhoneno = await AccessUserDetailsModel.findOne({ phoneNo: requestData.phoneNo, _id: { $ne: _id } });
    if (validatePhoneno) {
      return res.json({
        success: false,
        errormsg: "Phone number already registered",
      });
    }

    const otp = generateOTP();

    await AccessOTPModel.deleteMany({ employeeId: employeeId, mailID: requestData.mailID });

    await AccessOTPModel.create({ employeeId: employeeId, OTP: otp, mailID: requestData.mailID });

    let transporter = createUniversalTransporter();
    const _getParams = {
      phoneNo: requestData.phoneNo,
      otp,
    }
    const OTPTemplate = mailSentOTPTemplate(_getParams);

    // Email content
    let mailOptions = {
      from: '"Earth Recycler Pvt Ltd" <earthrecyclerpvtltd@gmail.com>',
      to: requestData.mailID,
      subject: 'Your Signup OTP Code',
      html: OTPTemplate,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(" Email sent successfully:", info.response);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);
      return res.json({
        success: false,
        errormsg:
          "Failed to send OTP email. Please verify your email address or try again later.",
      });
    }

    return res.json({
      success: true,
      errormsg: "Signup OTP sended successfully",
    });



  } catch (err) {
    console.dir(err)
    res.json({
      success: false,
      errormsg: err.message || "Something went wrong",
    });
  }
}

exports.UpdateUserVerifyOTP = async (req, res, next) => {
  try {
    const { _id, employeeId, OTP, ...requestData } = req.body;

    const validateUser = await AccessUserDetailsModel.findOne({ _id: employeeId })
    if (!validateUser) {
      return res.json({
        success: false,
        isLogout: true,
        errormsg: "User information not found.",
      });
    }

    const record = await AccessOTPModel.findOne({ employeeId, OTP, mailID: requestData.mailID })
    // Get the last ER number from the database

    if (!record) {
      return res.json({
        success: false,
        errormsg: "Invalid or expired OTP"
      });
    }

    await AccessOTPModel.deleteOne({ _id: record._id });

    let userDetail = requestData;

    //set password if not Field staff
    let transporter = createUniversalTransporter();

    const userData = await AccessUserDetailsModel.findOne({ _id });
    if (userData.password === undefined) {
      const password = uniqueReadablePassword();

      // hash password before insert
      const hashedPassword = await bcrypt.hash(password, 10);

      userDetail.password = hashedPassword;

      const _getParamsAddPassword = {
        userType: requestData.userType,
        password: password,
      };
      const Template = welcomeMailTemplate(_getParamsAddPassword);

      // Email content
      let mailOptions = {
        from: '"Earth Recycler Pvt Ltd" <earthrecyclerpvtltd@gmail.com>',
        to: requestData.mailID,
        subject: `Welcome to Earth Recycler`,
        html: Template,
      };
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(" Email sent successfully:", info.response);
      } catch (emailError) {
        console.error("❌ Email send error:", emailError);
        return res.json({
          success: false,
          errormsg:
            "Failed to send OTP email. Please verify your email address or try again later.",
        });
      }
    }

    const _getParamsUpdate = {
      userType: requestData.userType,
    };

    const TemplateUpdate = updateMailTemplate(_getParamsUpdate);

    // Email content
    let mailOptions = {
      from: '"Earth Recycler Pvt Ltd" <earthrecyclerpvtltd@gmail.com>',
      to: requestData.mailID,
      subject: "Account as been updated",
      html: TemplateUpdate,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(" Email sent successfully:", info.response);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError);
      return res.json({
        success: false,
        errormsg:
          "Failed to send OTP email. Please verify your email address or try again later.",
      });
    }

    await AccessUserDetailsModel.findOneAndUpdate(
      { _id },
      { $set: userDetail }
    )
    await AccessLogModel.create({
      referDocId: _id,
      EmployeeId: employeeId,
      ModuleName: "UserDetails",
      Sts: "Update",
    });
    res.json({
      success: true,
      errormsg: "User Details Updated successfully",
    });
  } catch (err) {
    console.dir(err)
    res.json({
      success: false,
      errormsg: err.message || "Something went wrong",
    });
  }
}

exports.LoginUser = async (req, res, next) => {
  try {
    const requestData = req.body;
    let query = {
      mailID: requestData.mailID
    };

    if (requestData.userType) {
      query.userType = requestData.userType;
    }
    // check if email exists
    const validateLoginID = await AccessUserDetailsModel.findOne(query);
    if (!validateLoginID) {
      return res.json({
        success: false,
        errormsg: "LoginID is Mismatched",
      });
    }

    // compare password
    const isMatch = await bcrypt.compare(requestData.password, validateLoginID.password);
    if (!isMatch) {
      return res.json({
        success: false,
        errormsg: "Password is incorrect",
      });
    }

    // sanitize before sending
    const sanitizedUser = await fnRemoveObj([validateLoginID]);

    res.json({
      success: true,
      errormsg: `${validateLoginID.userType} login successful`,
      value: sanitizedUser[0],
    });

  } catch (err) {
    console.dir(err)
    res.json({
      success: false,
      errormsg: err.message || "Something went wrong",
    });
  }
}

exports.ChangePassword = async (req, res, next) => {
  try {
    const requestData = req.body;
    const validateLoginID = await AccessUserDetailsModel.findOne({ _id: requestData._id })
    // compare password
    const isMatch = await bcrypt.compare(requestData.currentPassword, validateLoginID.password);
    if (!isMatch) {
      return res.json({
        success: false,
        errormsg: "Password is incorrect",
      });
    }
    const hashedPassword = await bcrypt.hash(requestData.password, 10);
    await AccessUserDetailsModel.findOneAndUpdate(
      { _id: requestData._id },
      { $set: { password: hashedPassword } }
    )

    res.json({
      success: true,
      errormsg: "password changed successfully",
    });

  } catch (err) {
    console.dir(err)
    res.json({
      success: false,
      errormsg: err.message || "Something went wrong",
    });
  }
}