require('dotenv').config(`${__dirname}/../.env`);
const { REGION, SQS_QUEUE_URL } = process.env;

const aws = require('aws-sdk');
aws.config.update({ region: REGION });

const SQS = new aws.SQS({ apiVersion: '2012-11-05' });

const params = {
    DelaySeconds: 10,
    MessageAttributes: {
        Title: {
            DataType: 'String',
            StringValue: 'Test Sending from Node.js',
        },
        Author: {
            DataType: 'String',
            StringValue: 'ReaderLand - branch SQS',
        },
    },
    MessageBody: 'This is just a test for Node server sending Message to SQS.',
    QueueUrl: SQS_QUEUE_URL,
};

SQS.sendMessage(params, function (err, data) {
    if (err) {
        console.log(err);
    } else {
        console.log('Success: \n', data.MessageId);
    }
});
