module.exports = {
  tables: [
    {
      TableName: 'table',
      KeySchema: [
        {AttributeName: 'galleryId', KeyType: 'HASH'},
        {AttributeName: 'version', KeyType: 'RANGE'},
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'AwakeAtIndex',
          KeySchema: [
            {AttributeName: 'version', KeyType: 'HASH'},
            {AttributeName: 'awakeAt', KeyType: 'RANGE'},
          ],
          Projection: {
            ProjectionType: 'INCLUDE',
            NonKeyAttributes: ['galleryId'],
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
      ],
      AttributeDefinitions: [
        {AttributeName: 'galleryId', AttributeType: 'S'},
        {AttributeName: 'awakeAt', AttributeType: 'S'},
        {AttributeName: 'version', AttributeType: 'N'},
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    },
  ],
  port: 8000,
};
