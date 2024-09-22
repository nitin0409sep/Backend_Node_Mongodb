const asynchandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
            .catch((err) => next(err))
    }
}

export { asynchandler };


// High Order Function - Can take fn as arg or return fn as a resp
// const asynchandler1 = (fn) => {
//     async (req, res, next) => {
//         try {
//             await fn(req, res, next);
//         } catch (err) {
//             res.status(err.code || 500).json({
//                 success: false,
//                 message: err.message
//             })
//         }
//     }
// }