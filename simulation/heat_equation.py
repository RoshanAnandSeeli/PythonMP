import numpy as np


def simulate_heat(grid_size, source_temp, steps=100):
    alpha = 0.25
    grid = np.zeros((grid_size, grid_size))

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
        grid[center, center] = source_temp

    return grid.tolist()


def cooling_suggestion(max_temp):
    if max_temp > 90:
        return "Critical temperature detected. Use heat sink with active cooling fan."
    elif max_temp > 70:
        return "High temperature detected. Improve airflow or apply thermal paste."
    else:
        return "Temperature stable. Cooling system adequate."
