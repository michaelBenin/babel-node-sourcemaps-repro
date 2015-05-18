process.on('uncaughtException', function(error) {
  console.log("uncaught");
});
require('source-map-support').install();
import { server, application } from './services/server';

// this doesn't exist
server.nonexist();

server.listen(8000, function () {
  console.log('server is running on port 8000');
});
