import Queue from 'sqsqs';
it("dead letters", async () => {
  let queue = new Queue({
    QueueUrl: 'https://sqs.ap-northeast-2.amazonaws.com/483868092732/CgDev-CrawlerDcinsideCrawlerDeadLetterQueueAF7454B4-4HP7Q85LDATQ',
    WaitTimeSeconds: 1,
  }, {
    region: 'ap-northeast-2'
  });
  const messages = await queue.receive(100);
  for(let m of messages){
    console.log(m.Body);
  }
});
