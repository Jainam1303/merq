const { sequelize } = require('./src/config/db'); 
const StockSentiment = require('./src/models/StockSentiment'); 
sequelize.authenticate().then(() => StockSentiment.sync({ force: true })).then(() => { console.log('Table created'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
