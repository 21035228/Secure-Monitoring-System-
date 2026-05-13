exports.APItest = async (req, res, next) => {
    try {
        const requestData = req.body;
        res.json({
            success: true,
            errormsg: "Test pass Successfully",
        });

    } catch (err) {
        console.dir(err)
        res.json({
            success: false,
            errormsg: err.message || "Something went wrong",
        });
    }
}
