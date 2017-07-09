const microcomponent = require('microcomponent')
const html = require('choo/html')
const morph = require('nanomorph')
const css = require('sheetify')
// const _flow = require('lodash/fp/flow')
const _isEmpty = require('lodash/isEmpty')
const _filter = require('lodash/filter')
const slug = require('slug/slug-browser')
const icon = require('./icon.js')

const prefix = css`
  :host ul li {
    list-style: none;
    margin: 0;
  }
  :host li {
    cursor: pointer;
    line-height: 48px;
    position: relative;
    padding-left: 1rem;
  }
  :host li:focus {
    outline: none;
    background: #f0f0f0;
  }
  :host li .list-icon {
    height: 48px;
    width: 48px;
    justify-content: center;
    align-items: center;
    position: absolute;
    right: 0;
    top: 0;
  }
  :host input.sticky {
    top: 60px;
  }
  @media(min-width: 960px) {
    :host input.sticky {
      top: 100px;
    }
  }
  :host input[type="search"] {
    appearance: none;
    background: #333;
    border: none;
    box-shadow: none;
    color: #fff;
    font-size: 1rem;
    padding-left: 1rem;
    width: 100%;
    z-index: 1;
  }
  :host input[type="search"]:focus {
    outline: none;
  }
  :host input[type="search"]::-webkit-input-placeholder {
    color: #f6f6f6;
    font-size: .8rem;
  }
  :host input[type="search"]::-webkit-search-cancel-button {
    appearance: none;
    height: 12px;
    width: 12px;
    color: #333;
    cursor: pointer;
    margin-right: 18px;
    background-size: 12px 12px;
    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGcgZmlsbD0ibm9uZSI+PGcgZmlsbD0iI0ZGRiI+PHBhdGggZD0iTTU5LjYgNTBMOTggMTEuNkMxMDAuNyA4LjkgMTAwLjcgNC42IDk4IDIgOTUuNC0wLjcgOTEtMC43IDg4LjQgMkw1MCA0MC40IDExLjYgMkM5LTAuNyA0LjYtMC43IDIgMiAtMC43IDQuNi0wLjcgOSAyIDExLjZMNDAuNCA1MCAyIDg4LjRDLTAuNyA5MS0wLjcgOTUuNCAyIDk4IDQuNiAxMDAuNyA5IDEwMC43IDExLjYgOThMNTAgNTkuNiA4OC40IDk4QzkxLjEgMTAwLjcgOTUuNCAxMDAuNyA5OCA5OCAxMDAuNyA5NS40IDEwMC43IDkxIDk4IDg4LjRMNTkuNiA1MFoiLz48L2c+PC9nPjwvc3ZnPg==);
  }
`

module.exports = Search

function Search () {
  const component = microcomponent({
    input: '',
    data: [],
    city: '',
    state: {
      search: {
        input: '',
        filtred: []
      },
      city: 'Bruxelles',
      data: [],
      selected: {},
      prevSelected: null
    }
  })

  component.on('render', render)
  component.on('update', update)
  component.on('load', load)
  component.on('unload', unload)

  return component

  function render () {
    const self = this
    const state = this.state

    state.data = component.props.data

    return html`
      <div class="${prefix}">
        <input
          autoFocus
          aria-label="search"
          autocomplete="false"
          id="searchinput"
          class="sticky"
          name="search"
          oninput=${handleInput}
          placeholder="Filtrer par nom, code postal, commune"
          type="search"
          value=${state.search.input}
        />
        ${renderResults()}
      </div>
    `

    function handleInput (e) {
      const oldValue = state.search.input
      const newValue = e.target.value
      state.search.input = newValue

      if (oldValue !== newValue) {
        morph(self._element.querySelector('.value'), renderValue(newValue))
        morph(self._element.querySelector('.results'), renderResults(newValue))
      }
    }

    function renderResults (value = state.search.input) {
      const { data } = component.props
      const { selected } = state
      const filtred = _filter(data, (item) => {
        const { title } = item
        const { zip, city } = item.address
        const s1 = slug(`${title} ${city} ${zip}`, {replacement: ' ', lower: true})
        const s2 = slug(value, {replacement: ' ', lower: true})
        return s1.includes(s2)
      })

      state.search.filtred = filtred

      return html`
        <div class="results ${prefix}">
          ${renderValue(value, filtred)}
          ${renderFiltred(selected)}
        </div>
      `

      function renderFiltred (selected) {
        return html`
          <ul class="filtred">
            ${filtred.map((item, index) => {
              const { title, featured } = item
              return html`
                <li tabindex="0" class="${isSelected(item, selected) ? 'selected' : ''}" onkeydown=${(e) => select(e, item)} onclick=${(e) => select(e, item)}>
                  ${title}
                  ${isSelected(item, selected) ? renderIcon(featured) : ''}
                </li>
              `
            })}
          </ul>
        `
      }

      function renderIcon (featured) {
        return html`
          <div class="layout list-icon">
            ${icon(featured ? 'marker-star' : 'marker', {'class': 'icon icon-medium icon-marker'})}
          </div>
        `
      }

      function isSelected (item, selected) {
        return item._id === selected._id
      }

      function select (e, item) {
        if (item._id !== component.state.selected) {
          morph(self._element.querySelector('.filtred'), renderFiltred(item))
        }
        component.state.selected = item
        component.emit('itemselected', item)
      }
    }

    function renderValue (value, filtred = state.filtred) {
      const val = html`<b class="bold">${value}</b>`
      const range = html`<b class="bold">1000km</b>`
      const city = html`<b class="bold">${state.city}</b>`
      return html`
        <span class="value">
          ${!_isEmpty(filtred) && value
            ? message(html`<span class="text">Résultats pour '${val}' dans un rayon de ${range} autour de ${city}</span>`)
            : ''}
          ${!_isEmpty(filtred) && !value ? message(html`<span class="text">Epiceries zéro déchet dans un rayon de ${range} autour de ${city}</span>`) : ''}
          ${_isEmpty(filtred) && value ? message(html`<span class="text">Aucun résultat pour '${val}'. <a href="/new">Ajouter un point</a> à la carte.</span>`) : ''}
        </span>
      `
    }

    function message (text) {
      return html`
        <div class="message">
          ${text}
        </div>
      `
    }
  }

  function load () {
    console.log('loaded')
  }

  function unload () {
    console.log('unloaded')
    component._element = null
  }

  function update (props) {
    return props.input !== component.state.search.input ||
      props.data.length !== component.state.data.length
  }
}
