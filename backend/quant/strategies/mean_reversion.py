import pandas as pd


def generate_signals(
    df,
    lookback=20,
    entry_z=2.0,
    exit_z=0.5
):
    """
    Mean-reversion strategy based on rolling z-score.

    Position:
        +1 = long
         0 = flat
        -1 = short
    """

    df = df.copy()

    # Rolling statistics
    df["rolling_mean"] = (
        df["close_price"]
        .rolling(lookback)
        .mean()
    )

    df["rolling_std"] = (
        df["close_price"]
        .rolling(lookback)
        .std()
    )

    # Z-score
    df["z_score"] = (
        (df["close_price"] - df["rolling_mean"])
        / df["rolling_std"]
    )

    position = 0
    positions = []

    for z in df["z_score"]:

        if pd.isna(z):
            positions.append(0)
            continue

        # Enter long when price is unusually low
        if position == 0 and z <= -entry_z:
            position = 1

        # Enter short when price is unusually high
        elif position == 0 and z >= entry_z:
            position = -1

        # Exit when price returns toward the mean
        elif position != 0 and abs(z) <= exit_z:
            position = 0

        positions.append(position)

    df["position"] = positions

    return df
