import { MountController } from 'kenote-express-helper'

export default MountController(
  require('./passport'),
  require('./security'),
  require('./group')
)