import PostMessageStream from './PostMessageStream'

declare global {
  interface Window {
    // add you custom properties and methods
    isTerraExtensionAvailable: boolean
    station: Extension
  }
}

interface ResponseData {
  name: string
  payload: object
}

type SendDataType = 'connect' | 'post' | 'sign' | 'info'

interface SendData {
  [key: string]: any
}

/**
 * Extension class is for communicating between page and extension
 */
class Extension {
  static instance: Extension
  private inpageStream: any

  /**
   * Using singleton pattern, hence every instanciation will return same value
   */
  constructor() {
    if (Extension.instance) {
      return Extension.instance
    }

    Extension.instance = this

    this.inpageStream = new PostMessageStream({
      name: 'station:inpage',
      target: 'station:content',
    })
  }

  destroy() {
    this.inpageStream && this.inpageStream.destroy()
  }

  private generateId(): number {
    return Date.now()
  }

  /**
   * Indicates the Station Extension is installed and availble (requires extension v1.1 or later)
   */
  get isAvailable(): boolean {
    return !!window.isTerraExtensionAvailable
  }

  /**
   * low level function for sending message to extension.
   * Do not use this function unless you know what you are doing.
   */
  send(type: SendDataType, data?: SendData): number {
    const id = this.generateId()

    this.inpageStream.write({
      ...data,
      id,
      type,
    })

    return id
  }

  /**
   * Listen to events from the Extension.
   * You will receive an event after calling connect, sign, or post.
   * payload structures are described on each function in @return section.
   *
   * @param name name of event (optional)
   * @param callback will be called when `name` event emits
   */
  on(name: string, callback: (payload: any) => void): void
  on(callback: (payload: any) => void): void
  on(...args: any[]): void {
    this.inpageStream.on('data', (data: ResponseData) => {
      if (typeof args[0] === 'string') {
        data.name === args[0] && args[1](data.payload, data.name)
      } else {
        args[0](data.payload, data.name)
      }
    })
  }

  /**
   * Send a request
   *
   * @param {SendDataType} type
   * @param {SendData} data
   */
  async request(type: SendDataType, data?: SendData): Promise<ResponseData> {
    this.send(type, data)

    return new Promise((resolve) => {
      this.inpageStream.once('data', resolve)
    })
  }
}

window.station = new Extension()
window.isTerraExtensionAvailable = true
