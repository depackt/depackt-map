const microcomponent = require('microcomponent')
const html = require('choo/html')
const isEqual = require('is-equal-shallow')
const morph = require('nanomorph')

module.exports = dropdownMenu

function dropdownMenu () {
  const component = microcomponent({
    props: {
      items: []
    },
    state: {
      open: false,
      items: []
    }
  })
  component.on('render', render)
  component.on('update', update)
  component.on('load', load)
  component.on('unload', unload)
  component.on('toggle', toggle)

  return component

  function toggle () {
    component.state.open = !component.state.open
    morph(component._element.querySelector('.dropdown-menu'), renderMenu(component.state))
  }

  function render () {
    const state = this.state

    state.items = this.props.items
    state.open = false
    state.title = this.props.title

    return html`
      <li>
        ${renderMenu(state)}
      </li>
    `
  }

  function renderMenu (state) {
    const { title, items, open } = state
    return html`
      <div class="dropdown-menu${open ? ' dropdown-menu--open' : ''}">
        <a href="" title="Change lang" class="btn btn-dropdown${open ? ' btn-dropdown--open' : ''}" onkeypress=${handleKeyPress} onclick=${(e) => component.emit('toggle')}>
          ${title.toUpperCase()}
        </a>
        ${open ? renderList() : ''}
      </div>
    `

    function handleKeyPress (e) {
      if (e.keyCode === 13) {
        component.emit('toggle')
      }
    }

    function renderList () {
      return html`
        <ul class="list menu">
          ${items.filter((item) => item.code !== title).map(menuItem)}
        </ul>
      `
    }

    function menuItem (item) {
      return html`
        <li>
          <button type="button" class="btn" onclick=${(e) => component.emit('select', item)}>${item.lang}</button>
        </li>
      `
    }
  }

  function update (props) {
    return !isEqual(component.state.items, props.items) ||
      props.open !== component.state.open ||
      props.title !== component.props.title
  }

  function load () {
    console.log('mounted on DOM')
  }

  function unload () {
    console.log('removed from DOM')
    component._element = null
  }
}
