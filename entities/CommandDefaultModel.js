const { EntitySchema } = require("typeorm");
const { UserConfig } = require("./UserConfigModel");

const CommandDefault = new EntitySchema({
  name: "CommandDefault",
  tableName: "COMMAND_DEFAULT",
  columns: {
    id: {
      type: Number,
      primary: true,
      nullable: false,
      name: "ID",
    },
    action: {
      type: String,
      length: 100,
      nullable: false,
      name: "ACTION",
    },
    defaults: {
      type: String,
      length: 100,
      nullable: false,
      name: "DEFAULTS",
    },
    typeId: {
      type: Number,
      nullable: false,
      name: "TPYE_ID",
  },
  },
   relations: {
    config: {
      type: "many-to-one",
      target: UserConfig,
      joinColumn: {
        name: "TPYE_ID",         // اسم العمود في هذا الجدول
        referencedColumnName: "configId" // اسم العمود في جدول UserConfig
      }
    }
  }
});

module.exports = { CommandDefault };