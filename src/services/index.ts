import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as cors from 'cors';

admin.initializeApp();

const corsHandler = cors({ origin: true });

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Cloud Function: sendConsentEmail
 * Generates math question, sends email, stores consent request
 */
export const sendConsentEmail = functions.https.onCall(
  async (data: { parentEmail: string; childUid: string }, context) => {
    const { parentEmail, childUid } = data;

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    // Validate inputs
    if (!parentEmail || !childUid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'parentEmail and childUid are required'
      );
    }

    try {
      // Generate random math question
      const num1 = Math.floor(Math.random() * 20) + 1;
      const num2 = Math.floor(Math.random() * 20) + 1;
      const mathQuestion = `${num1} + ${num2}`;
      const correctAnswer = num1 + num2;

      // Create unique consent ID
      const consentId = `${childUid}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store consent record with correct answer (for verification later)
      const consentRef = admin.firestore().collection('consents').doc(consentId);
      await consentRef.set({
        childUid,
        parentEmail,
        mathQuestion,
        correctAnswer,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        ),
      });

      // Email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: parentEmail,
        subject: 'Verify Your Child\'s Guftagu Account — Math Challenge',
        html: `
          <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #7C5CBF; margin-bottom: 16px;">Hi Parent!</h2>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Your child is setting up their Guftagu AI learning account.
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                To confirm you've given permission, please answer this quick math question:
              </p>
              <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="font-size: 28px; font-weight: bold; color: #7C5CBF; margin: 0;">
                  ${mathQuestion} = ?
                </p>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                <strong>Please reply to this email with just the number answer.</strong>
              </p>
              <p style="color: #999; font-size: 12px; line-height: 1.6;">
                This is a security measure to protect your child's account. This email expires in 24 hours.
              </p>
              <p style="color: #999; font-size: 12px;">Guftagu Team</p>
            </div>
          </div>
        `,
      };

      // Send email
      await transporter.sendMail(mailOptions);

      return {
        success: true,
        consentId,
        mathQuestion,
      };
    } catch (error) {
      console.error('Error sending consent email:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send consent email'
      );
    }
  }
);

/**
 * Cloud Function: verifyConsentAnswer
 * Verifies parent's math answer against stored value
 */
export const verifyConsentAnswer = functions.https.onCall(
  async (data: { consentId: string; answer: number }, context) => {
    const { consentId, answer } = data;

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    // Validate inputs
    if (!consentId || answer === undefined) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'consentId and answer are required'
      );
    }

    try {
      // Fetch consent document
      const consentRef = admin.firestore().collection('consents').doc(consentId);
      const consentDoc = await consentRef.get();

      if (!consentDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Consent request not found'
        );
      }

      const consentData = consentDoc.data();

      // Check if expired
      const now = Date.now();
      const expiresAt = consentData.expiresAt.toMillis();
      if (now > expiresAt) {
        throw new functions.https.HttpsError(
          'deadline-exceeded',
          'Consent request has expired'
        );
      }

      // Verify answer
      const isCorrect = answer === consentData.correctAnswer;

      if (isCorrect) {
        // Update consent document
        await consentRef.update({
          status: 'verified',
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update user profile in Firestore
        const userRef = admin
          .firestore()
          .collection('users')
          .doc(consentData.childUid);
        await userRef.update({
          parentConsent: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        verified: isCorrect,
        message: isCorrect
          ? 'Consent verified successfully!'
          : 'Incorrect answer. Please try again.',
      };
    } catch (error) {
      console.error('Error verifying consent answer:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to verify consent answer'
      );
    }
  }
);