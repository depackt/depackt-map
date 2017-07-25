/**
 * @link https://github.com/choojs/choo
 * @link https://github.com/stackcss/sheetify
 */

// require('babel-polyfill')

const choo = require('choo')
const logger = require('choo-log')
const persist = require('choo-persist')
const expose = require('choo-expose')
const css = require('sheetify')
const _findIndex = require('lodash/findIndex')
const Nanobounce = require('nanobounce')
const dpckt = require('./lib/depackt-api')

css('./styles/reset.css')
css('./styles/leaflet.css')
css('./styles/MarkerCluster.css')
css('./styles/MarkerCluster.Default.css')
css('./styles/github-markdown.css')
css('./styles/flex.css')
css('./styles/layout.css')
css('./styles/icons.css')

const Layout = require('./views/layout')
const NotFound = require('./views/404')
const AboutView = require('./views/about')
const ResourcesView = require('./views/resources')

const app = choo()

if (process.env.APP_ENV !== 'production') {
  app.use(logger())
  app.use(expose())
  app.use(require('choo-service-worker/clear')())
}

app.use(require('choo-service-worker')())
app.use(require('./lib/translations')())

app.use(persist())
app.use(store)

app.route('/', Layout(require('./views/main')))
app.route('/:bounds', Layout(require('./views/main')))
app.route('/new', Layout(require('./views/new')))
app.route('/directory', Layout(require('./views/directory')))
app.route('/about', Layout(AboutView))
app.route('/about/:hash', Layout(AboutView))
app.route('/about/:hash/*', Layout(NotFound))
app.route('/resources', Layout(ResourcesView))
app.route('/resources/:hash', Layout(ResourcesView))
app.route('/resources/:hash/*', Layout(NotFound))
app.route('/:bounds/*', Layout(NotFound))

app.mount('#app')

function store (state, emitter) {
  state.lang = state.lang || 'fr'

  state.form = {
    email: '',
    text: ''
  }

  state.dropdownOpen = state.dropdownOpen || false
  state.translations = state.translations || {}
  state.coords = [50.850340, 4.351710]
  state.zoom = 13
  state.locations = []
  state.tab = 'search'
  state.isMobile = !window.matchMedia('(min-width:960px)').matches
  state.tiles = state.tiles || undefined
  state.tilesAttribution = state.tilesAttribution || undefined
  state.mapBackground = state.mapBackground || 'light'

  emitter.on('DOMContentLoaded', () => {
    emitter.emit('load:translations', state.lang)
    emitter.on('set:coords', setCoords)
    emitter.on('get:locations', getLocations)
    emitter.on('toggle:lang', () => {
      state.dropdownOpen = !state.dropdownOpen
      emitter.emit('render')
    })

    emitter.on('sw:installed', sw)

    emitter.on('toggle:tab', toggleTab)

    getLocations({})

    const nanobounce = Nanobounce()

    window.onresize = callback

    function callback () {
      const prev = Object.assign({}, state)
      nanobounce(() => {
        emitter.emit('log:debug', 'Called onResize event')
        state.isMobile = !window.matchMedia('(min-width:960px)').matches
        if (prev.isMobile !== state.isMobile) {
          state.header = !state.isMobile
        }
        emitter.emit('render')
      })
    }
  })

  function toggleTab (tab) {
    const opened = state.tab === tab
    state.tab = opened ? '' : tab
    emitter.emit('render')
  }

  function sw (registration) {
    if (registration.active) {
      console.log(registration)
    }
  }

  function getLocations (payload) {
    const {
      lat = 50.850340,
      lng = 4.351710,
      distanceKm = 1000
    } = payload

    dpckt.getLocations({lat, lng, distanceKm}).then((response) => {
      const { data } = response
      if (!data.length) return

      const selected = data[0]
      const {lat, lng} = selected.address.location
      state.coords = [lat, lng]
      state.locations = data

      const index = _findIndex(state.locations, { _id: selected._id })
      state.selectedIndex = index

      emitter.emit('render')
    }).catch((err) => {
      if (err) console.log(err)
    })
  }

  function setCoords (options) {
    state.coords = options.coords
    state.zoom = options.zoom
    emitter.emit('render')
  }
}
