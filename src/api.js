//TODO: refactor to use URLSearchParams

const CRYPTOCOMPARE_API_KEY = '98675baaf4a3e1385603173a07df414cd68f60f685e6f08210a2fc0ba140c3f4'
const URL = 'https://min-api.cryptocompare.com/data/'
const tickersHandlers = new Map()

const AGGREGATE_INDEX = '5'

const socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${CRYPTOCOMPARE_API_KEY}`)
socket.addEventListener('message', e => {
    const { TYPE: type, FROMSYMBOL: tickerName, PRICE: price } = JSON.parse(e.data)
    if (type !== AGGREGATE_INDEX) {
        return
    }

    const handlers = tickersHandlers.get(tickerName) ?? []
    handlers.forEach(fn => fn(price))
})

export const getTickers = async () => {
    if (tickersHandlers.size === 0) return


    const response = await fetch(
        `${URL}pricemulti?fsyms=${[ ...tickersHandlers.keys() ].join(',')}&tsyms=USD&api_key={${process.env.CRYPTOCOMPARE_API_KEY}} `,
    )

    const rawData = await response.json()
    const updatedPrices = Object.fromEntries(Object.entries(rawData).map(([ key, value ]) => [ key, value.USD ]))

    Object.entries(updatedPrices).forEach(([ tickerName, price ]) => {
        const handlers = tickersHandlers.get(tickerName) ?? []
        handlers.forEach(fn => fn(price))
    })
}

export const getTickerList = async () => {
    const response = await fetch(URL + 'all/coinlist?summary=true')
    const { Data: tickerList } = await response.json()

    return tickerList
}

const sendToWebSocket = (message) => {
    const stringifiedMessage = JSON.stringify(message)

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(stringifiedMessage)
        return
    }

    socket.addEventListener('open', () => {
        socket.send(stringifiedMessage)
    }, { once: true })
}

const subscribeToTickerOnWS = (tickerName) => {
    sendToWebSocket({
       'action': 'SubAdd',
       'subs': [ `5~CCCAGG~${tickerName}~USD` ],
   })
}

const unsubscribeFromTickerOnWS = (tickerName) => {
    sendToWebSocket({
        'action': 'SubRemove',
        'subs': [ `5~CCCAGG~${tickerName}~USD` ],
    })
}

export const subscribeToUpdateTickerPrice = (ticker, cb) => {
    const subscribers = tickersHandlers.get(ticker) || []
    tickersHandlers.set(ticker, [ ...subscribers, cb ])
    subscribeToTickerOnWS(ticker)
}

export const unsubscribeFromUpdateTickerPrice = (ticker, cb) => {
    const subscribers = tickersHandlers.get(ticker) || []
    tickersHandlers.set(ticker, subscribers.filter(fn => fn !== cb))

    unsubscribeFromTickerOnWS(ticker)
}

setInterval(getTickers, 5000)