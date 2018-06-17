import AWS from 'aws-sdk';

// Notify support using AWS SNS
exports.notify = async (subject, json_message, logging_key, arn) => {
  return new Promise(resolve => {
    try {
      if (process.env.NODE_ENV === 'production') {
        logger.info(logging_key + ' notify - using iam role');
        AWS.config.update({
          region: process.env.DB_REGION,
        });
      } else {
        logger.info(logging_key + ' notify - using local credentials');
        AWS.config.loadFromPath('./mock/aws.dev.json');
      }

      const _subject = `${subject || 'Back-end process failure notification'} - ${logging_key.split(' ')[0]}`;
      const sns = new AWS.SNS();
      sns.publish({
        Subject: _subject.slice(0, 100),
        Message: JSON.stringify(json_message),
        TopicArn: arn || process.env.NOTIFICATION_ARN
      }, (err, data) => {
        try {
          if (err) { throw err; }
          logger.info(logging_key + ' notify - sns informed of completion ' + JSON.stringify(data));
          resolve(data);
        } catch (err) {
          logger.info(logging_key + ' - notify - Exception Occurred');
          logger.info(logging_key + ' - notify - error during sns publish');
          logger.info(logging_key, '-', err, err.stack);
          resolve();
        }
      });
    } catch (err) {
      logger.info(logging_key + ' - notify - Exception Occurred');
      logger.info(logging_key, '-', err, err.stack);
      resolve();
    }
  });
};
