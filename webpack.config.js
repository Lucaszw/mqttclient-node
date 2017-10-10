var config = {
  entry: './NodeMqttClient.js',
  output: {
    filename: 'bundle.common.js',
    libraryTarget: 'commonjs2'
  }
};

var webConfig = {
  entry: './NodeMqttClient.js',
  output: {
    filename: 'bundle.web.js',
    libraryTarget: 'var'
  }
};

module.exports = [config, webConfig];
