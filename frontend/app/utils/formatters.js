export const formatHandicapIndex = (handicap) => {
    if (handicap === null || handicap === undefined) return null
    
    // For scratch or better players (negative handicap), show with "+" prefix
    // For other players (positive handicap), show as is
    return handicap < 0 ? `+${Math.abs(handicap)}` : `${handicap}`
} 

export default formatHandicapIndex