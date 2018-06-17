/**
 * Class to ease out working with Queues.
 * Currently it uses Rabbit MQ as Queue.
 */
const amqp = require('amqplib');
const Boom = require('boom');

let conn = '';

/**
 * Connection method
 * - it has to be initialised at he start of the project
 * - once initialised, one can only retrive the same connection but not change it.
 */
async function createConnection() {
  try {
    if (conn) {
      return conn;
    }
    conn = await amqp.connect(`amqp:${process.env.MQ_Username}:${process.env.MQ_Password}@${process.env.MQ_URL}:${process.env.MQ_PORT}`);
    logger.info(`Connection to RabbitMQ Server established-${[process.env.MQ_URL]}`);
    return conn;
  } catch (error) {
    logger.error(`Error Connecting to RabbitMQ Server-${[process.env.MQ_URL]}`);
    throw Boom.serverUnavailable(`QueueConnectionError ${error.name}-${error.message}`);
  }
}

// @Singleton Connection
function getConnection() {
  if (conn) {
    return conn;
  }
  throw Boom.badImplementation('Queue connection object has not be initialized');
}

async function createChannel(connection) {
  try {
    const ch = await connection.createChannel();
    return ch;
  } catch (error) {
    throw error;
  }
}

async function createAndCheckQueue(ch, queueName, options = { durable: true }) {
  try {
    if (process.env.MQ_AUTO_DELETE === 'true' && process.env.NODE_ENV !== 'production') {
      delete options.durable;
      options.autoDelete = true;
    }
    const ok = await ch.assertQueue(queueName, options);
    return ok;
  } catch (error) {
    throw error;
  }
}

/**
 * Queue Class
 * @param {*} queueName
 * @param {*} options
 */
function Queue(name, opts) {
  const options = opts;
  const queueName = name;
  let producerChannel = '';
  let consumerChannel = '';
  const connection = getConnection();

  this.getConnectionObject = () => connection;
  this.getQueueName = () => queueName;
  this.getOptions = () => options;
  this.getProducerChannel = () => producerChannel;
  this.getConsumerChannel = () => consumerChannel;
  this.setProducerChannel = (ch) => { producerChannel = ch; };
  this.setConsumerChannel = (ch) => { consumerChannel = ch; };
}

// @throws Error
async function initializeQueue(opts) {
  try {
    if (opts.setProducer) {
      this.setProducerChannel(await createChannel(this.getConnectionObject()));

      // eslint-disable-next-line
      await createAndCheckQueue(this.getProducerChannel(), this.getQueueName(), this.getOptions())
    }
    if (opts.setConsumer) {
      this.setConsumerChannel(await createChannel(this.getConnectionObject()));

      // eslint-disable-next-line
      await createAndCheckQueue(this.getConsumerChannel(), this.getQueueName(), this.getOptions())
    }
    return true;
  } catch (error) {
    throw error;
  }
}

Queue.prototype.publishMessage = async function (message, opts = { persistent: true }) {
  try {
    const bufferMsg = Buffer.from(message); // Type Check for MessageBuffer

    logger.info('Message Published');
    await this.getProducerChannel().sendToQueue(this.getQueueName(), bufferMsg, opts);
  } catch (error) {
    logger.error(`Publish Message Error ${error.name}-${error.message}`);
    throw error;
  }
};

Queue.prototype.prefetch = function (count) {
  this.getConsumerChannel().prefetch(count);
};

Queue.prototype.consumeMessage = async function (consumer, opts = { noAck: false }) {
  // eslint-disable-next-line
  return this.getConsumerChannel().consume(this.getQueueName(), message => consumer(message, this.getConsumerChannel()), opts)
};

Queue.prototype.RegisterQueue = async function ({ prefetch, setProducer, setConsumer }) {
  try {
    const queue = new Queue(this.getQueueName(), this.getOptions());

    await initializeQueue.call(queue, {
      setProducer: setProducer || false,
      setConsumer: setConsumer || false,
    });

    if (prefetch) {
      queue.prefetch(prefetch);
    }
    logger.info(`Queue ${this.getQueueName()} initialized`);
    return queue;
  } catch (error) {
    logger.error(`InitializeQueueError-${this.getQueueName()}: ${error.name}-${error.message}`);
    throw error;
  }
};

module.exports = {
  createConnection,
  Queue,
};