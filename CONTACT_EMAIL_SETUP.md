# Contact Form Email Configuration

This document explains how to set up and configure the email functionality for the Live Journal contact form.

## Overview

The contact form sends emails in two ways:
1. **Admin Notification**: Sends the contact form submission to the admin email (mtechcs003@gmail.com)
2. **User Confirmation**: Sends a confirmation email to the user who submitted the form

## Setup Instructions

### 1. Gmail App Password Setup

Since the system uses Gmail for sending emails, you need to create an App Password:

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already enabled)
3. Scroll down to **App passwords**
4. Select app: **Mail**
5. Select device: **Other (Custom name)** → Enter "Live Journal"
6. Click **Generate**
7. Copy the 16-character password (it will look like: `xxxx xxxx xxxx xxxx`)

### 2. Backend Environment Variables

Add these variables to your backend `.env` file:

```env
# Email Configuration
EMAIL_USER=mtechcs003@gmail.com
EMAIL_PASSWORD=your_16_char_app_password_here
```

**Important**: Replace `your_16_char_app_password_here` with the App Password you generated in step 1.

### 3. Install Required Package

The `nodemailer` package has already been installed. If you need to reinstall:

```bash
cd livejournal-backend
npm install nodemailer
```

### 4. Restart the Backend Server

After adding the environment variables, restart your backend server:

```bash
cd livejournal-backend
npm start
```

## How It Works

### Frontend (Contact.jsx)
- User fills out the form with their name, email, and message
- On submission, the form data is sent to `/api/contact` endpoint
- Shows loading state while sending
- Displays success or error message based on response

### Backend (contactController.js)
- Validates the form data (name, email, message)
- Validates email format
- Creates two emails:
  - **Admin Email**: Beautiful HTML email with the contact details
  - **User Email**: Confirmation email thanking them for reaching out
- Sends both emails using nodemailer
- Returns success/error response to frontend

## Email Templates

### Admin Email Features:
- Professional gradient header
- Formatted contact information
- Message display with styling
- Timestamp of submission

### User Confirmation Email Features:
- Thank you message
- Copy of their submitted message
- Quick links section
- Professional branding

## Testing

1. Start both frontend and backend servers
2. Navigate to the Contact page
3. Fill out the form with valid information
4. Click "Send Message"
5. Check:
   - Success message appears on the page
   - Admin email receives the message at mtechcs003@gmail.com
   - User receives confirmation email at their provided address

## Troubleshooting

### Email Not Sending

1. **Check Environment Variables**: Ensure `EMAIL_USER` and `EMAIL_PASSWORD` are correctly set
2. **Check App Password**: Make sure you're using an App Password, not your regular Gmail password
3. **Check Gmail Security**: Ensure 2-Step Verification is enabled
4. **Check Console Logs**: Look for error messages in the backend console

### Error Messages

- **"Please provide name, email, and message"**: Form validation failed
- **"Please provide a valid email address"**: Email format is invalid
- **"Failed to send message"**: Server error or email configuration issue

## Alternative Email Services

If you want to use a different email service instead of Gmail:

### Outlook/Hotmail
```javascript
service: 'hotmail',
auth: {
  user: 'your-email@outlook.com',
  pass: 'your-password'
}
```

### Custom SMTP
```javascript
host: 'smtp.your-domain.com',
port: 587,
secure: false,
auth: {
  user: 'your-email@your-domain.com',
  pass: 'your-password'
}
```

## Security Notes

- Never commit the `.env` file to version control
- Always use App Passwords instead of regular passwords
- Keep your email credentials secure
- Consider rate limiting for production use

## Production Considerations

For production deployment:

1. **Add Rate Limiting**: Prevent spam by limiting submissions per IP
2. **Add CAPTCHA**: Implement reCAPTCHA to prevent bots
3. **Email Queue**: Use a queue system (like Bull) for handling emails
4. **Error Monitoring**: Set up error tracking (like Sentry)
5. **Email Service**: Consider using dedicated services like SendGrid, AWS SES, or Mailgun for better deliverability

## API Endpoint

**POST** `/api/contact`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello, I have a question..."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Message sent successfully! We'll get back to you soon."
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Failed to send message. Please try again later.",
  "error": "Error details"
}
```

## Files Modified/Created

### Backend:
- ✅ `livejournal-backend/controllers/contactController.js` - Email sending logic
- ✅ `livejournal-backend/routes/contact.js` - Contact route
- ✅ `livejournal-backend/index.js` - Added contact route

### Frontend:
- ✅ `FE/livejournal-frontend/src/pages/Contact/Contact.jsx` - Added API integration
- ✅ `FE/livejournal-frontend/src/pages/Contact/Contact.scss` - Error message styling

## Support

If you encounter any issues, check:
1. Backend console for error messages
2. Browser console for network errors
3. Email spam folder
4. Gmail account security settings

