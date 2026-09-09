/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  25 Jul 2025         Khanh Tran			    Init, create file.
 */
define(['N/runtime'],
    (runtime) => {
        const TYPE = "role";
    
        const Records = {
            Administrator: {
                ID: 3,
                NAME: "Administrator",
                CENTER_TYPE: "BASIC" 
            },
        }

        return {
            TYPE,
            Records,
        };
        
    });
    