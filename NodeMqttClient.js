const _ = require('lodash');
const crossroads = require('crossroads');
const Backbone = require('backbone');
const mqtt = require('mqtt')

const MQTTMessages = require('@mqttclient/mqtt-messages');

function resolveTarget(target){
  // TODO: allow for local, and absolute target paths
  // i.e. /execute => microdrop/plugin/execute
  //      microdrop/plugin/execute => microdrop/plugin/execute (same)
  if (target.charAt(0) != '/') target = `/${target}`
  return target;
}

class NodeMqttClient {
  constructor(host="localhost", port=1883, base="microdrop") {
    _.extend(this, Backbone.Events);
    _.extend(this, crossroads.create());
    _.extend(this, MQTTMessages);

    this.base = base;
    this.port = port;
    this.client = this.Client(host,port);
    this.subscriptions = new Array();

    // XXX: ignoreState variable used internally by crossroads
    this.ignoreState = true;
  }
  listen() {
    console.error(`No listen method implemented for ${this.name}`);
  }
  get connected() {
    return this.client.connected;
  }

  get name() {
    return encodeURI(this.constructor.name.split(/(?=[A-Z])/).join('-').toLowerCase());
  }
  get filepath() {
    const childName  = this.constructor.name;
    const parentName =  Object.getPrototypeOf(this.constructor).name;
    if (childName != parentName){
      throw `CLASS MISSING GETTER METHOD: filepath
      class ${childName} does not contain getter "filepath". Please implement.
      ex: class ${childName} {... get filepath() {return __dirname } ... }
      `
      return;
    }
    return __dirname;
  }
  get clientId() {
    return `${this.name}>>${this.filepath}>>${Date.now()}`;
  }
  get version() {return "0.0"}
  // ** Methods **
  addGetRoute(topic, method) {
    this.addRoute(topic, method);
    // Replace content within curly brackets with "+" wildcard
    this.subscriptions.push(topic.replace(/\{(.+?)\}/g, "+"));
  }
  addPostRoute(topic, event, retain=false, qos=0, dup=false){
    // TODO: Depricate channel (instead use base/plugin)
    topic = resolveTarget(topic);
    this.on(event, (d) => this.sendMessage(this.channel+topic, d, retain, qos, dup));
  }
  addPutRoute(plugin, state, event, retain=true, qos=0, dup=false){
    const channel = `${this.base}/put/${plugin}/state/${state}`;
    this.on(event, (d) => this.sendMessage(channel, d, retain, qos, dup));
  }
  addStateErrorRoute(state, event, retain=true, qos=0, dup=false){
    state = resolveTarget(state);
    const channel = `${this.base}/state/error${state}`;
    this.on(event, (d) => this.sendMessage(channel, d, retain, qos, dup));
  }
  addStateRoute(state, event, retain=true, qos=0, dup=false){
    state = resolveTarget(state);
    const channel = `${this.base}/state${state}`;
    this.on(event, (d) => this.sendMessage(channel, d, retain, qos, dup));
  }
  sendMessage(topic, msg={}, retain=false, qos=0, dup=false){
    const message = JSON.stringify(msg);
    const options = this.MessageOptions(retain,qos,dup);
    this.client.publish(topic, message, options);
  }
  // ** Event Handlers **
  onConnect() {
    // XXX: Depricating subscriptions to base
    //      Move to using same subscription model as WebMqttClient
    this.client.subscribe(`${this.base}/#`);
    for (var s of this.subscriptions) this.client.subscribe(s);
    this.listen();
    this.trigger("start",null);
  }
  onMessage(topic, buf){
    if (!topic) return;
    if (!buf.toString().length) return;
    try {
      const msg = JSON.parse(buf.toString());
      this.parse(topic, [msg]);
    } catch (e) {
      console.log(buf.toString());
      console.log(e);
    }
  }
  // ** Initializers **
  Client(host,port) {
    const client = mqtt.connect(`mqtt://${host}:${port}`,
      {clientId: this.clientId});
    client.on("connect", this.onConnect.bind(this));
    client.on("message", this.onMessage.bind(this));
    return client;
  }
  MessageOptions(retain=false, qos=0, dup=false) {
    const options = new Object();
    options.retain = retain;
    options.qos = qos;
    options.dup = dup;
    return options;
  }
};

module.exports = NodeMqttClient;
