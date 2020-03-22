'use strict'

const {PubSub} = require('@google-cloud/pubsub')
const NotifyClient = require('notifications-node-client').NotifyClient
const formPage = process.env.FORM_PAGE
const successPage = process.env.SUCCESS_PAGE
const errorPage = process.env.ERROR_PAGE
const notifyApiKey = process.env.NOTIFY_API_KEY
const notifySmsTemplateId = process.env.NOTIFY_SMS_TEMPLATE_ID
const notifyEmailTemplateId = process.env.NOTIFY_EMAIL_TEMPLATE_ID

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 * 
 */
exports.form = async(req, res) => {
  if (req.method === 'POST') {

    // Data to publish
    let message = JSON.stringify(req.body)
    const timestamp = new Date().toISOString()
    const id = generateId()
    const customAttributes = {'timestamp': timestamp, 'id': id}
    console.log(`Backup json: ${message} / ${JSON.stringify(customAttributes)}`)

    // Send message
    try {

      // Send the form submission to the queue
      const dataBuffer = Buffer.from(message);
      const pubSubClient = new PubSub();
      const messageId = await pubSubClient
        .topic('form-submissions')
        .publish(dataBuffer, customAttributes)
      console.log(`Message ${messageId} published (${JSON.stringify(customAttributes)}).`)

      notify(req.body.email, req.body.phone, id)

      // Redirect to the success page
      console.log(`Redirecting to success page: ${successPage}`)
      res.redirect(`${successPage}?id=${id}`)

    } catch(error) {

      // Log the error and redirect to the error page
      console.error("Error publishing message to pubsub", error)
      console.error(new Error(`Error `))
      console.log(`Redirecting to error page: ${errorPage}`)
      res.redirect(`${errorPage}?id=${id}`)
    }

  } else {
    // Bounce the user back to the form
    console.log("Redirecting back to form page.")
    res.redirect(formPage)
  }
};

function notify() {

  if (notifyApiKey) {

    // Send a confirmation if we have an email or a phone number
    var notifyClient = new NotifyClient(notifyApiKey)
    personalisation = {reference: id}

    if (req.body.email) {

      if (notifyEmailTemplateId) {
        console.log(`Sending email notification`)
        notifyClient
          .sendEmail(notifyEmailTemplateId, req.body.email, personalisation)
          .then(response => console.log(response))
          .catch(err => console.error(err))
      } else {
        console.warn(`No Notify email template ID set. Unable to confirm form submission ${id}`)
      }

    } else if (req.body.phone) {

      if (notifySmsTemplateId) {
        console.log(`Sending sms notification`)
        personalisation = {reference: id}
        if (notifyEmailReplyAddress) {
          personalisation["emailReplyToId"] = notifyEmailReplyAddress
        }
        notifyClient
          .sendSms(notifySmsTemplateId, req.body.phone, personalisation)
          .then(response => console.log(response))
          .catch(err => console.error(err))
      } else {
        console.warn(`No Notify SMS template ID set. Unable to confirm form submission ${id}`)
      }

    } else {
      console.warn(`Neither 'email' nor 'phone' present in form submission ${id}.`)
    }

  } else {
    console.log("Notify API key not set. Skipping notifications.")
  }
}

function generateId() {
  // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
  const length = 8
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  var result = '';
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
