import numpy as np


def simulate_heat(grid_size, source_temp, steps=300, core_layout=None):
    alpha = 0.25
    grid = np.zeros((grid_size, grid_size))

    if core_layout:
        # Place heat sources at each core position (normalized 0-1 coords)
        for (r, c) in core_layout:
            ri = int(r * (grid_size - 1))
            ci = int(c * (grid_size - 1))
            grid[ri, ci] = source_temp
    else:
        center = grid_size // 2
        grid[center, center] = source_temp

    for _ in range(steps):
        grid[1:-1, 1:-1] += alpha * (
            grid[2:, 1:-1] +
            grid[:-2, 1:-1] +
            grid[1:-1, 2:] +
            grid[1:-1, :-2] -
            4 * grid[1:-1, 1:-1]
        )
        # Re-apply heat sources every step
        if core_layout:
            for (r, c) in core_layout:
                ri = int(r * (grid_size - 1))
                ci = int(c * (grid_size - 1))
                grid[ri, ci] = source_temp
        else:
            center = grid_size // 2
            grid[center, center] = source_temp

    return grid.tolist()


def cooling_suggestion(max_temp):
    if max_temp > 90:
        return "Critical temperature detected. Use heat sink with active cooling fan."
    elif max_temp > 70:
        return "High temperature detected. Improve airflow or apply thermal paste."
    else:
        return "Temperature stable. Cooling system adequate."
