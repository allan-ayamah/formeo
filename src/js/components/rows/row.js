import i18n from 'mi18n'
import Sortable from 'sortablejs'
import dom from '../../common/dom'
import h, { bsGridRegEx } from '../../common/helpers'
import { data } from '../../common/data'
import Controls from '../controls'
import rows from './index'
import Component from '../component'
import Columns from '../columns'
import { numToPercent } from '../../common/utils'
import events from '../../common/events'

const DEFAULT_DATA = {
  config: {
    fieldset: false, // wrap contents of row in fieldset
    legend: '', // Legend for fieldset
    inputGroup: false, // is repeatable input-group?
  },
  children: [],
}

/**
 * Editor Row
 */
export default class Row extends Component {
  /**
   * Set default and generate dom for row in editor
   * @param  {String} dataID
   * @return {Object}
   */
  constructor(rowData) {
    super('row', Object.assign({}, DEFAULT_DATA, rowData))

    const rowConfig = {
      tag: 'li',
      className: 'stage-rows empty',
      dataset: {
        hoverTag: i18n.get('row'),
        editingHoverTag: i18n.get('editing.row'),
      },
      id: this.id,
      content: [this.actionButtons(), this.editWindow],
      fType: 'rows',
    }

    const row = dom.create(rowConfig)

    this.sortable = Sortable.create(row, {
      animation: 150,
      // fallbackClass: 'column-moving',
      // forceFallback: true,
      group: { name: 'rows', pull: true, put: ['rows', 'controls', 'columns'] },
      sort: true,
      onRemove: this.onRemove,
      onEnd: this.onEnd,
      onAdd: this.onAdd,
      onSort: this.onSort,
      // onMove: evt => {
      //   console.log(evt)
      // },
      filter: '.resize-x-handle',
      draggable: '.stage-columns',
    })

    this.dom = row

    rows.add(this)
  }

  /**
   * Edit window for Row
   * @return {Object} [description]
   */
  get editWindow() {
    const _this = this
    const rowData = this.data
    // debugger

    const editWindow = {
      tag: 'div',
      className: 'row-edit group-config',
    }
    const fieldsetLabel = {
      tag: 'label',
      content: i18n.get('row.settings.fieldsetWrap'),
    }
    const fieldsetInput = {
      tag: 'input',
      id: _this.id + '-fieldset',
      attrs: {
        type: 'checkbox',
        checked: h.get(rowData, 'config.fieldset'),
        ariaLabel: i18n.get('row.settings.fieldsetWrap.aria'),
      },
      action: {
        click: ({ target: { checked } }) => {
          rowData.setIn(['config', 'fieldset'], checked)
          data.save()
        },
      },
    }

    const inputGroupInput = {
      tag: 'input',
      id: _this.id + '-inputGroup',
      attrs: {
        type: 'checkbox',
        checked: h.get(rowData, 'config.inputGroup'),
        ariaLabel: i18n.get('row.settings.inputGroup.aria'),
      },
      action: {
        click: ({ target: { checked } }) => {
          h.get(rowData, ['config', 'inputGroup'], checked)
          // rowData.config.inputGroup = e.target.checked
          data.save()
        },
      },
      config: {
        label: i18n.get('row.makeInputGroup'),
        description: i18n.get('row.makeInputGroupDesc'),
      },
    }

    // let fieldsetAddon = Object.assign({}, fieldsetLabel, {
    // content: [fieldsetInput, ' Fieldset']
    // });
    const inputAddon = {
      tag: 'span',
      className: 'input-group-addon',
      content: fieldsetInput,
    }
    const legendInput = {
      tag: 'input',
      attrs: {
        type: 'text',
        ariaLabel: 'Legend for fieldset',
        value: h.get(rowData, 'config.legend'),
        placeholder: 'Legend',
      },
      action: {
        input: ({ target: { value } }) => {
          rowData['config'].legend = value
          data.save()
        },
      },
      className: '',
    }

    const fieldsetInputGroup = {
      tag: 'div',
      className: 'input-group',
      content: [inputAddon, legendInput],
    }

    const fieldSetControls = dom.formGroup([fieldsetLabel, fieldsetInputGroup])
    const columnSettingsLabel = Object.assign({}, fieldsetLabel, {
      content: 'Define column widths',
    })
    const columnSettingsPresetLabel = Object.assign({}, fieldsetLabel, {
      content: 'Layout Preset',
      className: 'col-sm-4 form-control-label',
    })
    const columnSettingsPresetSelect = {
      className: 'col-sm-8',
      content: this.columnPresetControl(),
    }
    const formGroupContent = [columnSettingsPresetLabel, columnSettingsPresetSelect]
    const columnSettingsPreset = dom.formGroup(formGroupContent, 'row')

    editWindow.children = [
      inputGroupInput,
      dom.create('hr'),
      fieldSetControls,
      dom.create('hr'),
      columnSettingsLabel,
      columnSettingsPreset,
    ]

    return editWindow
  }

  /**
   * Update column order and save
   * @param  {Object} evt
   */
  onSort(evt) {
    data.saveColumnOrder(evt.target)
    data.save()
  }

  /**
   * Handler for removing content from a row
   * @param  {Object} evt
   */
  onRemove = evt => {
    dom.columnWidths(evt.from)
    data.saveColumnOrder(evt.target)
    console.log(evt.to)
    dom.emptyClass(evt.from)
  }

  /**
   * Handler for removing content from a row
   * @param  {Object} evt
   */
  onEnd = evt => {
    console.log('onEnd', evt)
    if (evt.from.classList.contains('empty')) {
      dom.removeEmpty(evt.from)
    }

    data.save()
  }

  /**
   * Handler for adding content to a row
   * @param  {Object} evt
   */
  onAdd(evt) {
    const { from, item, to } = evt
    const fromRow = from.fType === 'rows'
    const fromColumn = from.fType === 'columns'
    const fromControls = from.fType === 'controlGroup'
    let column
    console.log('row.js onAdd')

    if (fromRow) {
      column = item
    } else if (fromColumn || fromControls) {
      const meta = h.get(Controls.get(item.id).controlData, 'meta')
      if (meta.group !== 'layout') {
        column = dom.addColumn(to)
        dom.addField(column, item.id)
      } else if (meta.id === 'layout-column') {
        dom.addColumn(to)
      }
    }

    if (fromColumn || fromControls) {
      dom.remove(item)
    }

    data.saveColumnOrder(to)

    dom.columnWidths(to)
    dom.emptyClass(to)
    // data.save()
  }

  /**
   * Load columns to row
   * @param  {Object} row
   */
  loadColumns(row) {
    const columns = this.data.children
    return columns.map(columnId => {
      const column = this.addColumn(columnId)
      column.loadFields()
      return column
    })
  }

  get columns() {
    return this.data.children.map(childId => Columns.get(childId))
  }

  addColumn = (columnId, index = this.columns.length) => {
    const column = Columns.get(columnId)
    this.dom.insertBefore(column.dom, this.dom.children[index])
    this.set(`children.${index}`, column.id)
    this.emptyClass()
    this.autoColumnWidths()

    return column
  }

  /**
   * Read columns and generate bootstrap cols
   * @param  {Object}  row    DOM element
   */
  autoColumnWidths = () => {
    const columns = this.columns
    const columnsLength = columns.length
    if (!columnsLength) {
      return
    }
    const width = parseFloat((100 / columnsLength).toFixed(1)) / 1

    columns.forEach(column => {
      column.removeClasses(bsGridRegEx)
      const colDom = column.dom
      const newColWidth = numToPercent(width)
      column.set('config.width', newColWidth)
      colDom.style.width = newColWidth
      // colDom.style.float = 'left'
      colDom.dataset.colWidth = newColWidth
      column.refreshFieldPanels()
      document.dispatchEvent(events.columnResized)
    })

    // fields.forEach(fieldId => Fields.get(fieldId).panelNav.refresh())

    // setTimeout(() => fields.forEach(fieldId => Fields.get(fieldId).panelNav.refresh()), 250)

    // dom.updateColumnPreset(row)
  }

  /**
   * Updates the column preset <select>
   * @return {Object} columnPresetConfig
   */
  updateColumnPreset = () => {
    const oldColumnPreset = this.dom.querySelector('.column-preset')
    const rowEdit = oldColumnPreset.parentElement
    const columnPresetConfig = this.columnPresetControl(this.id)
    const newColumnPreset = this.create(columnPresetConfig)

    rowEdit.replaceChild(newColumnPreset, oldColumnPreset)
    return columnPresetConfig
  }

  /**
   * Generates the element config for column layout in row
   * @return {Object} columnPresetControlConfig
   */
  columnPresetControl = () => {
    const _this = this
    const layoutPreset = {
      tag: 'select',
      attrs: {
        ariaLabel: 'Define a column layout', // @todo i18n
        className: 'column-preset',
      },
      action: {
        change: ({ target: { value } }) => {
          const dRow = this.rows.get(this.id)
          _this.setColumnWidths(dRow.row, value)
          data.save()
        },
      },
    }
    const pMap = new Map()
    const custom = { value: 'custom', label: 'Custom' }

    pMap.set(1, [{ value: '100.0', label: '100%' }])
    pMap.set(2, [
      { value: '50.0,50.0', label: '50 | 50' },
      { value: '33.3,66.6', label: '33 | 66' },
      { value: '66.6,33.3', label: '66 | 33' },
      custom,
    ])
    pMap.set(3, [
      { value: '33.3,33.3,33.3', label: '33 | 33 | 33' },
      { value: '25.0,25.0,50.0', label: '25 | 25 | 50' },
      { value: '50.0,25.0,25.0', label: '50 | 25 | 25' },
      { value: '25.0,50.0,25.0', label: '25 | 50 | 25' },
      custom,
    ])
    pMap.set(4, [{ value: '25.0,25.0,25.0,25.0', label: '25 | 25 | 25 | 25' }, custom])
    pMap.set('custom', [custom])

    if (this.columns.length) {
      const columns = this.columns
      const pMapVal = pMap.get(columns.length)
      layoutPreset.options = pMapVal || pMap.get('custom')
      const curVal = columns.map(({ data }) => data.config.width.replace('%', '')).join(',')
      if (pMapVal) {
        pMapVal.forEach((val, i) => {
          const options = layoutPreset.options
          if (val.value === curVal) {
            options[i].selected = true
          } else {
            delete options[i].selected
            options[options.length - 1].selected = true
          }
        })
      }
    } else {
      layoutPreset.options = pMap.get(1)
    }

    return layoutPreset
  }
}
