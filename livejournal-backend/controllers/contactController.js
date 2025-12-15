const nodemailer = require('nodemailer');
const createTransporter = () => {
  const emailPassword = (process.env.EMAIL_PASSWORD || '').replace(/\s/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'mtechcs003@gmail.com',
      pass: emailPassword
    }
  });
};

const sendContactEmail = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and message'
      });
    }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const transporter = createTransporter();

    const adminMailOptions = {
      from: process.env.EMAIL_USER || 'mtechcs003@gmail.com',
      to: process.env.EMAIL_USER || 'mtechcs003@gmail.com',
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">📬 New Contact Message</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1; margin-top: 0;">Contact Details</h2>
            <div style="margin: 20px 0;">
              <p style="margin: 10px 0;"><strong style="color: #6366f1;">👤 Name:</strong> ${name}</p>
              <p style="margin: 10px 0;"><strong style="color: #6366f1;">📧 Email:</strong> <a href="mailto:${email}" style="color: #8b5cf6;">${email}</a></p>
            </div>
            <div style="margin: 20px 0; padding: 20px; background: #f8f9ff; border-left: 4px solid #6366f1; border-radius: 5px;">
              <h3 style="color: #6366f1; margin-top: 0;">💬 Message:</h3>
              <p style="line-height: 1.6; color: #333;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
              <p style="margin: 5px 0; font-size: 14px;">Sent from Live Journal Contact Form</p>
              <p style="margin: 5px 0; font-size: 12px;">📅 ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      `
    };

    // Confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER || 'mtechcs003@gmail.com',
      to: email,
      subject: 'Thank you for contacting Live Journal! 🌟',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">✨ Thank You for Reaching Out!</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #6366f1;">Hi ${name}! 👋</h2>
            <p style="line-height: 1.6; color: #333; font-size: 16px;">Thank you for contacting <strong style="color: #8b5cf6;">Live Journal</strong>. We've received your message and our team will get back to you within 24 hours.</p>
            
            <div style="margin: 25px 0; padding: 20px; background: #f8f9ff; border-radius: 10px; border-left: 4px solid #6366f1;">
              <h3 style="color: #6366f1; margin-top: 0;">📝 Your Message:</h3>
              <p style="line-height: 1.6; color: #555; font-style: italic;">"${message.substring(0, 150)}${message.length > 150 ? '...' : ''}"</p>
            </div>

            <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%); border-radius: 10px;">
              <h3 style="color: #6366f1; margin-top: 0;">⚡ Quick Links:</h3>
              <p style="margin: 10px 0;">
                <a href="https://your-website.com" style="color: #8b5cf6; text-decoration: none; font-weight: bold;">🏠 Visit Our Website</a>
              </p>
              <p style="margin: 10px 0;">
                <a href="tel:+919100659045" style="color: #8b5cf6; text-decoration: none; font-weight: bold;">📱 Call Us: +91 9100659045</a>
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">Best regards,</p>
              <p style="color: #6366f1; font-weight: bold; font-size: 16px; margin: 5px 0;">The Live Journal Team 🚀</p>
            </div>

            <div style="margin-top: 20px; text-align: center; padding: 15px; background: #f9fafb; border-radius: 8px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">This is an automated confirmation. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      `
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('Error sending contact email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      error: error.message
    });
  }
};

module.exports = {
  sendContactEmail
};
