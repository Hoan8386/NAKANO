/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  28 Feb 2024         Huy Pham			    Init, create file
 */
define(['N/query'],
    (query) => {
        const RECORDS = {
            JPN: {
                ID: 1,
                NAME: "JPN"
            },
            VND: {
                ID: 7,
                NAME: "VND"
            },
        }

        const getInfoCurrencyById = (_currencyId) => {
            if(!_currencyId) return [];

            var resultSQL = query.runSuiteQL({
                query: `SELECT id, name, exchangerate, isbasecurrency, currencyprecision, displaysymbol
                from currency
                where id IN (${_currencyId.split(",").join(',')})
                order by id asc`
            });
            return resultSQL.asMappedResults();
        }

        const getFirstInfoCurrencyById = (_currencyId) => {
            let arrCurrency = getInfoCurrencyById(_currencyId);

            return arrCurrency.length > 0 ? arrCurrency[0] : null;
        }

        return {
            TYPE: "currency",
            RECORDS,
            getInfoCurrencyById,
            getFirstInfoCurrencyById
        };
        
    });
    