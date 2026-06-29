import { Component } from 'react'
import './app.scss'

class App extends Component {
  componentDidMount() {
    console.log('App 已加载')
  }

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return this.props.children
  }
}

export default App
