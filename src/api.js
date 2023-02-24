//TODO: refactor to use URLSearchParams

const URL = 'https://min-api.cryptocompare.com/data/'
const tickersHandlers = new Map()
export const getTickers = async () => {
    if (tickersHandlers.size === 0) return


    const response = await fetch(
        `${URL}pricemulti?fsyms=${[ ...tickersHandlers.keys() ].join(',')}&tsyms=USD&api_key={${process.env.CRYPTOCOMPARE_API_KEY}} `,
    )

    const rawData = await response.json()
    const updatedPrices = Object.fromEntries(Object.entries(rawData).map(([ key, value ]) => [ key, value.USD ]))

    Object.entries(updatedPrices).forEach(([tickerName, price]) => {
     const handlers = tickersHandlers.get(tickerName) ?? []
        handlers.forEach(fn => fn(price))
    })
}

export const getTickerList = async () => {
    const response = await fetch(URL + 'all/coinlist?summary=true')
    const { Data: tickerList } = await response.json()

    return tickerList
}

export const subscribeToUpdateTickerPrice = (ticker, cb) => {
    const subscribers = tickersHandlers.get(ticker) || []
    tickersHandlers.set(ticker, [ ...subscribers, cb ])
}

export const unsubscribeFromUpdateTickerPrice = (ticker, cb) => {
    const subscribers = tickersHandlers.get(ticker) || []
    tickersHandlers.set(ticker, subscribers.filter(fn => fn !== cb))
}

setInterval(getTickers, 5000)