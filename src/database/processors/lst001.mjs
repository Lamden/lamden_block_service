export const isLst001 = (code, debug = false) => {
    if (!code) return false
    const required_fields = ["def transfer", "def approve", "def transfer_from"];

    let missing = required_fields.map((field) => code.includes(field));
    let missing_idx = missing.findIndex((field) => field === false);

    return missing_idx > -1 ? false : true;
}