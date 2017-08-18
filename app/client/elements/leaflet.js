/**
 * Component adapted from
 * @link https://github.com/yoshuawuyts/nanocomponent/blob/master/example/leaflet.js
 * Other
 * @link http://leafletjs.com/
 * @link https://github.com/yoshuawuyts/microcomponent
 */

const microcomponent = require('microcomponent')
const L = require('leaflet')
require('leaflet.markercluster')
require('../lib/leaflet.zoomhome')
const onIdle = require('on-idle')
const html = require('choo/html')

module.exports = Leaflet

function Leaflet () {
  const component = microcomponent({
    coords: [50.850340, 4.351710],
    id: 'map',
    sideBarOpen: false,
    zoom: 15,
    items: [], // data items used to create markers and popups
    selectedIndex: 0,
    mapbox: {
      accessToken: '',
      background: 'light'
    },
    state: {
      sideBarOpen: false,
      map: null,
      markers: null
    }
  })

  const markersLayer = L.markerClusterGroup()

  component.on('render', render)
  component.on('update', update)
  component.on('load', load)
  component.on('unload', unload)

  component.on('zoomtoselected', _zoomtoselected)

  return component

  function _zoomtoselected (item = {}) {
    const { _id } = item // get objectid
    if (!_id) return false
    const selected = component.state.markers.find((o) => o.item._id === _id)
    markersLayer.zoomToShowLayer(selected.marker, () => {
      selected.marker.openPopup()
    })
  }

  function render () {
    const state = this.state
    state.sideBarOpen = this.props.sideBarOpen

    if (!component.state.map) {
      component._element = html`<div id=${this.props.id}></div>`
      if (component._hasWindow) {
        _createMap()
        _addMarkers()
      }
    } else {
      onIdle(function () {
        _updateMap()
      })
    }

    return component._element
  }

  function update (props) {
    return props.coords[0] !== component.props.coords[0] ||
      props.coords[1] !== component.props.coords[1] ||
      props.sideBarOpen !== component.state.sideBarOpen
  }

  function load () {
    component.state.map.invalidateSize()
    _zoomtoselected(component.props.items[component.props.selectedIndex])
  }

  function unload () {
    component.state.map.remove()
    component.state = {}
    component._element = null
  }

  function _addMarkers () {
    markersLayer.clearLayers()
    const { items = [], popupDisabled = false } = component.props

    const { background = 'light' } = component.props.mapbox
    const colorInvert = background === 'light' ? 'dark' : 'light'

    const customOptions = {
      'maxWidth': '240',
      'className': 'custom'
    }

    const defaultIcon = L.divIcon({
      className: 'default-marker-icon',
      html: `
        <svg viewBox="0 0 16 16" class="icon icon-large icon-${colorInvert} icon-marker">
          <use xlink:href="#icon-marker" />
        </svg>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    })

    const featuredIcon = L.divIcon({
      className: 'featured-marker-icon',
      html: `
        <svg viewBox="0 0 16 16" class="icon icon-large icon-${colorInvert} icon-marker">
          <use xlink:href="#icon-marker-star" />
        </svg>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    })

    const markers = items.map((item, index) => {
      const { lat, lng } = item.address.location
      const marker = L.marker([lat, lng], { icon: item.featured ? featuredIcon : defaultIcon })
      if (!popupDisabled) {
        marker.bindPopup(_customPopup(item), customOptions)
      }
      marker._index = index
      markersLayer.addLayer(marker)
      return {
        item,
        marker
      }
    })

    component.state.markers = markers

    return markers
  }

  function _addControlPlaceholders (map) {
    const corners = map._controlCorners
    const l = 'leaflet-'
    const container = map._controlContainer

    function createCorner (vSide, hSide) {
      const className = l + vSide + ' ' + l + hSide

      corners[vSide + hSide] = L.DomUtil.create('div', className, container)
    }

    createCorner('verticalcenter', 'left')
    createCorner('verticalcenter', 'right')
  }

  function _customPopup (item) {
    const { url, title, cover } = item
    const { streetName, streetNumber, zip, city } = item.address
    const template = `
      <a href=${url} target="_blank" rel="noopener" class="external">
        <div class="cover">
          <div class="image" style="background: url(${cover.src}) center center/cover no-repeat #333"></div>
        </div>
        <div class="title">
          ${title}
          <svg viewBox="0 0 16 16" class="icon icon-small icon-arrow-north-east">
            <use xlink:href="#icon-arrow-north-east" />
          </svg>
        </div>
        <div class="address">
          ${streetName}, ${streetNumber} ${zip} ${city}
        </div>
      </a>
    `

    return template
  }

  function _createMap () {
    const element = component._element
    const { coords, zoom } = component.props
    const { background = 'light', accessToken } = component.props.mapbox
    const defaultTiles = `https://api.mapbox.com/styles/v1/mapbox/${background}-v9/tiles/256/{z}/{x}/{y}?access_token=${accessToken}`
    const defaultTilesAttribution = '&copy; <a href="https://www.mapbox.com/map-feedback/">Mapbox</a>'
    const { tiles = defaultTiles, tilesAttribution = defaultTilesAttribution } = component.props
    const mapboxFeedback = '<strong><a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noopener noreferrer">Improve this map</a></strong>'

    const options = {
      center: coords,
      zoom,
      zoomControl: false,
      scrollWheelZoom: false
    }

    const map = L.map(element, options)

    const tileLayer = L.tileLayer(tiles, {
      attribution: `${tilesAttribution} &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ${!component.props.tiles ? mapboxFeedback : ''}`,
      minZoom: 0,
      maxZoom: 20,
      ext: 'png'
    })

    tileLayer.addTo(map)

    map.on('zoomhome', (e) => {
      _updateMap()
    })

    /**
     * Enable/disable scrollWheelZoom
     */

    map.once('focus', () => map.scrollWheelZoom.enable())

    map.on('click', () => {
      if (map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.disable()
      } else {
        map.scrollWheelZoom.enable()
      }
    })

    /**
     * Init Leaflet.markercluster
     * @link https://github.com/Leaflet/Leaflet.markercluster
     */

    markersLayer.addTo(map)

    /**
     * How to locate leaflet zoom control in a desired position
     * @link https://stackoverflow.com/questions/33614912/how-to-locate-leaflet-zoom-control-in-a-desired-position
     */

    _addControlPlaceholders(map) // How to locate leaflet zoom control in a desired position

    L.control.scale({position: 'verticalcenterright'}).addTo(map)

    /**
     * Center leaflet popup AND marker to the map
     * @link https://stackoverflow.com/questions/22538473/leaflet-center-popup-and-marker-to-the-map
     */

    map.on('popupopen', (e) => {
      const index = e.popup._source._index

      if (index !== component.props.selectedIndex) {
        component.emit('select', component.props.items[index])
      }

      const px = map.project(e.popup._latlng) // find the pixel location on the map where the popup anchor is
      px.y -= e.popup._container.clientHeight / 2 // find the height of the popup container, divide by 2, subtract from the Y axis of marker location
      map.panTo(map.unproject(px), {animate: true}) //
    })

    const zoomHome = new L.Control.ZoomHome({
      zoomHomeText: `
        <svg viewBox="0 0 16 16" class="icon icon-mini icon-home">
          <use xlink:href="#icon-home" />
        </svg>
      `
    })

    zoomHome.addTo(map)

    component.state.map = map
  }

  function _updateMap () {
    // const { coords, zoom } = component.props
    _addMarkers()
    component.state.map.invalidateSize()
    _zoomtoselected(component.props.items[component.props.selectedIndex])
    // component.state.map.setView(coords, zoom)
  }
}
