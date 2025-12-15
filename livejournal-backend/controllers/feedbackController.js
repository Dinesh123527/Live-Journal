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

const getStarsEmoji = (rating) => {
  const filled = '⭐';
  const empty = '☆';
  return filled.repeat(rating) + empty.repeat(5 - rating);
};

// Convert rating to label
const getRatingLabel = (rating) => {
  const labels = {
    1: 'Not great',
    2: 'Could be better',
    3: "It's okay",
    4: 'Pretty good!',
    5: 'Loved it!'
  };
  return labels[rating] || 'Unknown';
};

const sendFeedbackEmail = async (req, res) => {
  try {
    const { rating, feedback, username, email } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating (1-5)'
      });
    }

    const transporter = createTransporter();

    const adminMailOptions = {
      from: process.env.EMAIL_USER || 'mtechcs003@gmail.com',
      to: process.env.EMAIL_USER || 'mtechcs003@gmail.com',
      subject: `📊 Live Journal Feedback: ${getStarsEmoji(rating)} from ${username || 'Anonymous User'} (${email || 'No email'})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">📊 User Feedback Received</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Someone just shared their experience!</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Rating Section -->
            <div style="text-align: center; margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); border-radius: 10px;">
              <p style="font-size: 36px; margin: 0 0 10px 0;">${getStarsEmoji(rating)}</p>
              <p style="font-size: 24px; font-weight: bold; color: #8b5cf6; margin: 0;">${rating}/5 Stars</p>
              <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">${getRatingLabel(rating)}</p>
            </div>

            <!-- User Info -->
            <div style="margin: 20px 0;">
              <h2 style="color: #6366f1; margin-bottom: 15px; font-size: 18px;">👤 User Information</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; background: #f8f9ff; border-radius: 5px 0 0 5px; width: 30%;"><strong style="color: #6366f1;">Username:</strong></td>
                  <td style="padding: 10px; background: #f8f9ff; border-radius: 0 5px 5px 0;">${username || 'Anonymous'}</td>
                </tr>
                <tr><td colspan="2" style="height: 5px;"></td></tr>
                <tr>
                  <td style="padding: 10px; background: #f8f9ff; border-radius: 5px 0 0 5px;"><strong style="color: #6366f1;">Email:</strong></td>
                  <td style="padding: 10px; background: #f8f9ff; border-radius: 0 5px 5px 0;">
                    ${email ? `<a href="mailto:${email}" style="color: #8b5cf6;">${email}</a>` : 'Not provided'}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Feedback Message -->
            ${feedback ? `
              <div style="margin: 25px 0; padding: 20px; background: #f8f9ff; border-left: 4px solid #8b5cf6; border-radius: 5px;">
                <h3 style="color: #6366f1; margin: 0 0 10px 0;">💬 Additional Feedback:</h3>
                <p style="line-height: 1.6; color: #333; margin: 0;">${feedback.replace(/\n/g, '<br>')}</p>
              </div>
            ` : `
              <div style="margin: 25px 0; padding: 15px; background: #f9fafb; border-radius: 5px; text-align: center;">
                <p style="color: #9ca3af; margin: 0; font-style: italic;">No additional feedback provided</p>
              </div>
            `}

            <!-- Timestamp -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
              <p style="margin: 5px 0; font-size: 14px;">📅 Feedback received on ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0; font-size: 12px;">Live Journal Feedback System</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(adminMailOptions);

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    console.error('Error sending feedback email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again later.',
      error: error.message
    });
  }
};

module.exports = {
  sendFeedbackEmail
};
