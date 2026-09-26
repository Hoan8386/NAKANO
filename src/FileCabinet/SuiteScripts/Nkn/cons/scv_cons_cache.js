/**
 * Nội dung: 
 * Version: 1.250507.3
 * =======================================================================================
 *  Date                Author                  Description
 *  07 Mar 2025		    Huy Pham			    Init, create file
 */
define(['N/cache', 'N/runtime'],
function(cache, runtime) {
	const ID = "";
    const TYPE = "";
	const RECORDS = {
        TTL: 86400
    }

    const getCurrentCache = (_key = "") =>{
        let keyId = (_key||"").toString();

        if(!keyId.toString()){
            keyId = runtime.getCurrentScript().id;
        }

        return cache.getCache({
            name: keyId,
            scope: cache.Scope.PUBLIC
        });
    }

    const genKeyDataByUser = (_keyId) =>{
        let curUserId = runtime.getCurrentUser().id;

        return curUserId + "_" + _keyId;
    }

    const formatDataPut = (_strInput) =>{
        return {
            user: runtime.getCurrentUser(),
            data: _strInput
        }
    }

    const putData = (_putKeyId, _strData, _nameCache = "", _ttl = RECORDS.TTL) => {
        if(!_strData.toString() || !_putKeyId) return null;

        let myCache = getCurrentCache(_nameCache);

        let primaryKey = _putKeyId;

        let objRes = formatDataPut(_strData);

        myCache.put({key: primaryKey, value: JSON.stringify(objRes), ttl: _ttl});

        return {
            primaryKey: primaryKey
        };
    }

    const getData = (_getKeyId, _isRemove = false, _nameCache = "") => {
        let myCache = getCurrentCache(_nameCache);

        let primaryKey = _getKeyId;

        let dataCache = myCache.get({key: primaryKey, loader: 'loader'});

        let objRes = formatDataPut("");

        if(!!dataCache){
            objRes = JSON.parse(dataCache);

            if(_isRemove){
                myCache.remove({key: primaryKey});
            }
        }

        return objRes;
    }

    const removeData = (_getKeyId, _nameCache = "") =>{
        let myCache = getCurrentCache(_nameCache);

        let primaryKey = _getKeyId;

        myCache.remove({key: primaryKey});
    }

    const putDataByUser = (_putKeyId, _strData, _nameCache = "") => {
        let primaryKey = genKeyDataByUser(_putKeyId)

        return putData(primaryKey, _strData, _nameCache);
    }

    const getDataByUser = (_getKeyId, _isRemove = false, _nameCache = "") => {
        let primaryKey = genKeyDataByUser(_getKeyId)

        return getData(primaryKey, _isRemove, _nameCache);
    }

    const removeDataByUser = (_getKeyId, _nameCache = "") =>{
        let primaryKey = genKeyDataByUser(_getKeyId);

        removeData(primaryKey, _nameCache)
    }

    return {
		ID,
		TYPE,
		RECORDS,
        putData,
        getData,
        removeData,
		putDataByUser,
        getDataByUser,
        removeDataByUser
    };
    
});
