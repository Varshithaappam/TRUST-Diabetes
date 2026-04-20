// Email configuration for password reset
// Reads from .env file

const smtpPort = parseInt(process.env.SMTP_PORT) || 465;

export const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465, // true for port 465 (SSL), false for port 587 (TLS/STARTTLS)
    auth: {
        user: process.env.SMTP_USER || 'your-app@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    }
};

// Alternative port 587 with STARTTLS
export const emailConfigAlt = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'your-app@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    }
};

// Read from env or use default
const getFromAddress = () => {
    if (process.env.EMAIL_FROM) {
        return process.env.EMAIL_FROM;
    }
    const smtpUser = process.env.SMTP_USER || 'your-app@gmail.com';
    return `TRUST Diabetes Registry <${smtpUser}>`;
};

// Password reset email template
export const getPasswordResetEmail = (email, resetToken) => {
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    const fromAddress = getFromAddress();
    
    return {
        from: fromAddress,
        subject: 'Reset Your Password - TRUST Diabetes Registry',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(to right, #1e293b, #4f46e5); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">TRUST Diabetes Registry</h1>
                </div>
                <div style="padding: 30px; background: #f8fafc;">
                    <h2 style="color: #1e293b;">Reset Your Password</h2>
                    <p style="color: #64748b;">We received a request to reset your password. Click the button below to create a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                        Or copy this link to your browser:<br>
                        <span style="color: #4f46e5;">${resetLink}</span>
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        This link will expire in 1 hour.<br>
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
                <div style="background: #1e293b; padding: 15px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        © 2026 TRUST Diabetes Healthcare System
                    </p>
                </div>
            </div>
        `,
        text: `Reset Your Password - TRUST Diabetes Registry\n\nWe received a request to reset your password.\n\nClick the link below to create a new password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`
    };
};

// Send email function with retry logic
export const sendPasswordResetEmail = async (email, resetToken) => {
    let lastError = null;
    
    // Try primary config (port 465 SSL)
    const configs = [emailConfig, emailConfigAlt];
    
    for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        try {
            console.log(`Trying SMTP config ${i + 1}: ${config.host}:${config.port} (secure: ${config.secure})`);
            
            // Dynamic import nodemailer
            const nodemailer = await import('nodemailer');
            
            // Create transporter
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: config.auth
            });
            
            // Test connection
            await transporter.verify();
            console.log('SMTP connection verified');
            
            const { subject, html, text } = getPasswordResetEmail(email, resetToken);
            
            // Send the email
            const info = await transporter.sendMail({
                from: getFromAddress(),
                to: email,
                subject,
                html,
                text
            });
            
            console.log(`Password reset email sent successfully! Message ID: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error(`SMTP config ${i + 1} failed:`, error.message);
            lastError = error;
        }
    }
    
    console.error('All SMTP configs failed. Last error:', lastError.message);
    return false;
};

// Test function to verify SMTP connection
export const testEmailConnection = async () => {
    console.log('Testing SMTP connection...');
    return await sendPasswordResetEmail('test@example.com', 'test-token');
};