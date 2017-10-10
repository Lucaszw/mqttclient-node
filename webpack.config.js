var config = {
  entry: './NodeMqttClient.js',
  output: {
    filename: 'bundle.common.js',
    // use library + libraryTarget to expose module globally
    library: 'NodeMqttClient',
    libraryTarget: 'commonjs2'
  }
};

module.exports = [ config ];
