/**
 * AWS SQS helper methods
 */

import AWS from 'aws-sdk';
import { notify } from './notify';

const get_SQS_resource = () => {
  if (process.env.NODE_ENV === 'development') {
    logger.info('getting sqs resource using IAM');
    AWS.config.loadFromPath('./mock/aws.dev.json');
  } else {
    logger.info('getting sqs resource using config');
    AWS.config.update({
      region: process.env.SQS_REGION
    });
  }
  return new AWS.SQS();
};

exports.send_SQS_message = async (message_payload, queue_name, logging_key) => {
  try {
    const sqs = get_SQS_resource();
    const sqs_params = {
      MessageBody: JSON.stringify(message_payload),
      MessageGroupId: queue_name,
      QueueUrl: process.env.SQS_BASE_URL + queue_name
    };

    logger.info(logging_key + ' = message_payload has been requested to put in ' + queue_name);
    sqs.sendMessage(sqs_params, async (err, data) => {
      try {
        if (err) {
          logger.info(logging_key + ' = sqs send_message error ');
          logger.info(err, err.stack);
        }
        logger.info(logging_key + ' = message_payload had been successfully sent to ' + queue_name);
      } catch (error) {
        const notification_message = {
          environment: process.env.ENVIRONMENT,
          step: logging_key,
          stacktrace: error.stack,
          message: `${logging_key} - SQS - SQS failure - ${queue_name}`
        };
        await notify('SQS Error', notification_message, logging_key);
      }
    });
  } catch (error) {
    const notification_message = {
      environment: process.env.ENVIRONMENT,
      step: logging_key,
      stacktrace: error.stack,
      message: `${logging_key} - SQS - SQS failure - ${queue_name}`
    };
    await notify('SQS Error', notification_message, logging_key);
  }
};

exports.receive_SQS_message = async (queue_name, logging_key) => {
  return new Promise((resolve, reject) => {
    logger.info(logging_key + ' receive_SQS_message processing for ... ' + queue_name);
    const sqs = get_SQS_resource();
    const sqs_params = {
      QueueUrl: process.env.SQS_BASE_URL + queue_name,
      MaxNumberOfMessages: 10,
      VisibilityTimeout: 30
    };
    logger.info(logging_key + ' = receive_SQS_message checking for message in Queue:' + queue_name);
    sqs.receiveMessage(sqs_params, (err, data) => {
      if (err) {
        logger.info(logging_key + ' = sqs receive_message error ');
        logger.info(err, err.stack);
        return reject(err);
      }
      if (data.Messages) {
        logger.info(logging_key + ' receive_SQS_message messages present for ' + queue_name);
        return resolve(data.Messages);
      } else {
        logger.info(logging_key + ' receive_SQS_message no messages present for ' + queue_name);
        return resolve({});
      }
    });
  });
};

exports.delete_SQS_message = (queue_name, message_id, receipt_handle, logging_key) => {
  logger.info(logging_key + ' delete_SQS_message processing for ... ' + message_id);
  const sqs = get_SQS_resource();

  return new Promise((resolve, reject) => {
    const sqs_params = {
      'QueueUrl': process.env.SQS_BASE_URL + queue_name,
      'ReceiptHandle': receipt_handle
    };
    logger.info(logging_key + ' params = ' + JSON.stringify(sqs_params));
    sqs.deleteMessage(sqs_params, (err, data) => {
      if (err) {
        logger.info(logging_key + ' = sqs delete_message error ');
        logger.info(err, err.stack);
        return reject(err);
      }

      logger.info(logging_key + ' delete_SQS_message  deleted = ' + message_id);
      return resolve(data);
    });
  });
};
