import { createAction } from 'redux-actions'
import isEmpty from 'lodash/isEmpty'

import * as api from '../../lib/api'
import { camelCaseObject } from '../../lib/utils'

import { DEFAULT_BOOK } from '../../constans'

export const setTickerLoading = createAction('SET_TICKER_LOADING')
export const setTickerError = createAction('SET_TICKER_ERROR')
export const setMarketsLoading = createAction('SET_MARKETS_LOADING')
export const setMarketsError = createAction('SET_MARKETS_ERROR')

/**
 * Get available books from the bitso api and dispatch to the store
 */
export const getAvailableBooks = () => async dispatch => {
  const { payload: availableBooks, success } = await api.getAvailableBooks()
  if (!success) throw new Error(availableBooks.message)

  dispatch({ type: 'SET_BOOKS_LIST', payload: availableBooks })
  return availableBooks
}

/**
 * Get the ticker data from the bitso api and dispatch to the store
 * @param {string} bookToFilter - The book to filter data
 */
export const getTickerData = (bookToFilter = DEFAULT_BOOK) => async dispatch => {
  dispatch({ type: 'SET_TICKER_LOADING', payload: true })
  const { payload, success } = await api.getTickerData({ book: bookToFilter })
  if (!success) {
    dispatch({ type: 'SET_TICKER_LOADING', payload: false })
    dispatch({ type: 'SET_TICKER_ERROR', payload: { value: true, message: payload.message } })
    throw new Error(payload.message)
  }
  dispatch({ type: 'SET_CURRENT_BOOK', payload: payload })
  dispatch({ type: 'SET_TICKER_ERROR', payload: { value: false, message: '' } })
  dispatch({ type: 'SET_TICKER_LOADING', payload: false })
  return payload
}

/**
 * Get the latest trades data from the bitso api and dispatch to the store
 * @param {string} bookToFilter - The book to filter data
 */
export const getLatestTrades = (bookToFilter = DEFAULT_BOOK) => async dispatch => {
  const { payload, success } = await api.getLatestTrades({ book: bookToFilter })
  if (!success) throw new Error(payload.message)
  const data = payload.map(ticker => camelCaseObject(ticker))
  dispatch({ type: 'SET_LATEST_TRADES', payload: data })
  return payload
}

/**
 * Get the asks and bids data from the api and dispatch to the store
 * @param {string} bookToFilter - The book to filter data
 */
export const getOrderBook = (bookToFilter = DEFAULT_BOOK) => async dispatch => {
  const { payload, success } = await api.getOrderBook({ book: bookToFilter })
  if (!success) throw new Error(payload.message)
  const data = camelCaseObject(payload)

  const bidsSum = data.bids.reduce((reducer, bid) => (
    parseFloat(bid.amount) + reducer
  ), 0)

  const asksSum = data.asks.reduce((reducer, ask) => (
    parseFloat(ask.amount) + reducer
  ), 0)

  dispatch({
    type: 'SET_ORDER_BOOK_DATA',
    payload: {
      ...data,
      bidsSum,
      asksSum
    }
  })
  return payload
}

/**
 * Get the trades data of all books from the api and dispatch to the store
 * @param {Object} query - the query to filter items
 * @param {number} [query.limit=100] - the limit of the response
 * @param {string} [query.sort=desc] - the param to sort data
 */
export const getMarketsData = ({ limit = 100, sort = 'desc' }) => async (dispatch, getState) => {
  dispatch({ type: 'SET_MARKETS_LOADING', payload: true })
  let books = getState().books.list
  if (isEmpty(books)) {
    const { payload, success } = await api.getAvailableBooks()
    if (!success) {
      dispatch({ type: 'SET_MARKETS_ERROR', payload: { value: true, errorMessage: payload.message } })
      dispatch({ type: 'SET_MARKETS_LOADING', payload: false })
      throw new Error(payload.message)
    }
    books = payload
  }

  const tradesPromises = books.map(currentBook => api.getLatestTrades({ book: currentBook.book, limit }))

  const responses = await Promise.all(tradesPromises)
  const data = books.map((book, index) => {
    const data = sort === 'asc' ? responses[index].payload.reverse() : responses[index].payload
    return {
      book: camelCaseObject(book),
      data: data.map(item => camelCaseObject(item))
    }
  })

  dispatch({ type: 'SET_MARKETS_LIST', payload: data })
  dispatch({ type: 'SET_MARKETS_ERROR', payload: { value: false, errorMessage: '' } })
  dispatch({ type: 'SET_MARKETS_LOADING', payload: false })
  return data
}

/**
 * Get the ticker timeline data from the bitso api and dispatch to the store
 * @param {string} bookToFilter - Specifies which book to use
 * @param {string} time - Specifies time to filter, possible values: 1month, 3month, 1year
 */
export const getTickerTimeline = (bookToFilter = DEFAULT_BOOK, time = '1year') => async dispatch => {
  const payload = await api.getTickerTimeline(bookToFilter, time)
  const data = payload.map(ticker => camelCaseObject(ticker))
  dispatch({ type: 'SET_TICKER_TIMELINE', payload: data })
  return payload
}
