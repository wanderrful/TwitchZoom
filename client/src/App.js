import React, { Component } from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import classNames from "classnames";

import globalEmotes from "./data/emotes.json";

import "./App.css";

const WS_URL = window.location.origin.replace(/^http/, 'ws');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      channel: "",
      messages: [],
      retrieveStream: false,
      currentChannelName: ""
    };

    this.socket = null;
    this.timeout = null;
  }

  getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }

    return color;
  };

  getRandomHeight = () => {
    return Math.max(5, Math.min(95, Math.round(100 * Math.random())));
  };

  handleMessageState = response => {
    const content = JSON.parse(response.data);
    const { userstate, message } = content;
    // Keep messages inside viewport
    const windowHeight = window.innerHeight;
    const randomHeight = this.getRandomHeight();
    const height = randomHeight >= windowHeight ? windowHeight : randomHeight;
    const newMessage = {
      id: userstate.id,
      user: userstate.username,
      color: userstate.color || this.getRandomColor(),
      height,
      message
    };
    let messages = [...this.state.messages, newMessage];
    // Limit messages array to 100 at a time
    if (messages.length >= 100) {
      messages = messages.slice(messages.length - 60);
    }
    this.setState({ messages });
  };

  handleSwitchChannel = () => {
    const { channel } = this.state;
    if (channel.trim().length > 0) {
      this.setState({ currentChannelName: channel });
      this.establishSocketConnection();
    }
  };

  establishSocketConnection = () => {
    if (this.socket !== null && this.socket.readyState !== WebSocket.CLOSED) this.socket.close();

    this.socket = new WebSocket(WS_URL);
    this.socket.onopen = this.onOpenedSocket;
    this.socket.onclose = e => console.log("** Socket connection closed");
    this.socket.onmessage = this.handleMessageState;
  }

  onOpenedSocket = e => {
    const { currentChannelName } = this.state;
    console.log("** Socket connection established with back-end server!");
    this.socket.send(currentChannelName);
  }

  handleChannelSearch = event => {
    event.preventDefault();
    this.handleSwitchChannel();
  };

  handleInputChange = ({ currentTarget: { name, value } }) => {
    this.setState({ [name]: value });
  };

  removeMessage = id => {
    const { messages } = this.state;
    this.setState(state => ({
      messages: messages.filter(message => message.id !== id)
    }));
  };

  parseMessage = msg => {
    let splitText = msg.split(" ");
    splitText.forEach((word, i) => {
      if (globalEmotes[word]) {
        const emote = (
          <img
            className="emote"
            src={ `http://static-cdn.jtvnw.net/emoticons/v1/${
              globalEmotes[word].id
              }/3.0` }
            key={ globalEmotes[word].id + i }
            alt={ globalEmotes[word].id }
          />
        );

        // Replace the word with the HTML string
        splitText[i] = emote;
      } else {
        splitText[i] += " ";
      }
    });

    return splitText;
  };

  displayMessages = () => this.state.messages.map(({ id, height, color, user, message }) => (
    <CSSTransition
      key={ id }
      timeout={ 10000 }
      classNames="fly"
      unmountOnExit
      onEntered={ () => {
        this.removeMessage(id);
      } }
    >
      <div
        className="msg-container"
        style={ {
          top: height + "%",
          color
        } }
      >
        <span className="msg-user">{ user }</span>:{ " " }
        <span className="msg-content">{ this.parseMessage(message) }</span>
      </div>
    </CSSTransition>
  ));

  parseChannelFromURL = () => {
    if (window.location.pathname !== '/') {
      const channel = window.location.pathname.replace('/', '').split('/')[0];
      if (channel !== "") {
        this.handleSwitchChannel();
        this.setState({ channel: channel, currentChannelName: channel });
        this.timeout = setTimeout(() => {
          this.handleSwitchChannel();
        }, 300);
      }
    }
  };

  componentDidMount() {
    this.parseChannelFromURL();
  }

  componentWillUnmount() {
    this.socket.terminate();
    if (!!this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  render() {
    const {
      channel,
      messages,
      retrieveStream,
      currentChannelName
    } = this.state;
    return (
      <div className="app-container">
        <form
          onSubmit={ this.handleChannelSearch }
          className={ classNames("form-group", {
            controlsInvisible: !!currentChannelName.length
          }) }
        >
          <input
            type="text"
            name="channel"
            value={ channel }
            className="form-control"
            autoFocus={ true }
            placeholder="Type a twitch channel to get chat comments..."
            onChange={ this.handleInputChange }
          />
          <button
            className="btn btn-primary btn-sm btn-block"
            type="submit"
          >
            Tune in!
          </button>
        </form>
        <TransitionGroup className="app-group">
          { currentChannelName.trim() !== "" &&
            !retrieveStream && (
              <iframe
                src={ `https://player.twitch.tv/?channel=${currentChannelName}` }
                height={ window.innerHeight }
                width={ window.innerWidth }
                frameBorder="0"
                scrolling="no"
                title={ currentChannelName }
                allowFullScreen={ true }
              />
            ) }
          { messages.length > 0 && this.displayMessages() }
        </TransitionGroup>
      </div>
    );
  }
}

export default App;
