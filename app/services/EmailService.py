from datetime import timedelta
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from app.config import settings
from app.core.security import create_access_token


class EmailService:
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.EMAIL,
            MAIL_PASSWORD=settings.PASS,
            MAIL_FROM=settings.EMAIL,
            MAIL_PORT=587,
            MAIL_SERVER="smtp.gmail.com",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
        )
        self.fm = FastMail(self.conf)

    async def send_verification_email(self, email: str):
        token = create_access_token(
            data={"email": email},
            expires_delta=timedelta(hours=24)
        )
        verify_url = f"{settings.API_URL}/auth/verify/?token={token}"
        template = self._build_verification_template(verify_url)

        message = MessageSchema(
            subject="Coffee Shop Account Verification Email",
            recipients=[email],
            body=template,
            subtype="html"
        )

        try:
            await self.fm.send_message(message)
        except Exception as e:
            print(f"Error sending verification email: {e}")
            raise

    @staticmethod
    def _build_verification_template(verify_url: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Email Verification</title>
          </head>
          <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f5f6fa;">
            <div style="display:flex; justify-content:center; align-items:center; height:100vh;">
              <div style="background:#ffffff; padding:2rem 3rem; border-radius:0.75rem; 
                          box-shadow:0 4px 12px rgba(0,0,0,0.1); max-width:500px; text-align:center;">

                <h2 style="margin-bottom:1rem; color:#333;">Account Verification</h2>
                <p style="color:#555; font-size:1rem; line-height:1.5;">
                  Thank you for registering with <strong>Coffee Shop</strong> 🎉 <br>
                  Please confirm your email address by clicking the button below:
                </p>
                <a href="{verify_url}" 
                   style="display:inline-block; margin-top:1.5rem; padding:0.75rem 1.5rem; 
                          background-color:#0275d8; color:#ffffff; text-decoration:none; 
                          border-radius:0.5rem; font-size:1rem; font-weight:bold;">
                  Verify your Email
                </a>
                <p style="margin-top:2rem; font-size:0.9rem; color:#888;">
                  If you did not sign up for Coffee shop, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
        """
