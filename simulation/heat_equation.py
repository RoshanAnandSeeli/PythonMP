"""
Heat Equation Solver — 2D Finite Difference Method
===================================================
Solves the steady-state heat equation on a 2D grid using an explicit
iterative finite-difference scheme.

The thermal conductivity (alpha) is scaled based on the component's
TDP to produce realistic diffusion behaviour for different chip types.

Functions:
    get_alpha(tdp)         — Returns thermal conductivity coefficient.
    simulate_heat(...)     — Runs the heat diffusion simulation.
    cooling_suggestion(...) — Returns an AI-style cooling recommendation.
"""

from typing import List, Optional

import numpy as np


def get_alpha(tdp: float) -> float:
    """
    Returns the thermal diffusivity coefficient (alpha) based on TDP.

    Higher TDP components have higher alpha values, meaning heat spreads
    faster across the die — consistent with real-world high-power chips
    that use larger, more conductive die substrates.

    Args:
        tdp: Thermal Design Power in watts.

    Returns:
        Alpha value (0.15 – 0.35) used in the finite-difference step.
    """
    if tdp >= 300:
        return 0.35
    if tdp >= 100:
        return 0.28
    if tdp >= 50:
        return 0.22
    return 0.15


def simulate_heat(
    grid_size: int,
    source_temp: float,
    steps: int = 300,
    core_layout: Optional[List] = None,
    tdp: float = 65.0,
) -> List[List[float]]:
    """
    Runs a 2D heat diffusion simulation.

    Creates an NxN grid and applies a fixed heat source at specified
    core locations (or the centre if no layout is given).  Iteratively
    diffuses heat outward using the discrete Laplacian operator.

    Args:
        grid_size:    Number of rows/columns in the square grid (5–100).
        source_temp:  Temperature of the heat source(s) in °C.
        steps:        Number of iterations for the finite-difference solver.
        core_layout:  Optional list of [row_frac, col_frac] positions
                      normalised to [0, 1].  Each entry places a fixed
                      heat source on the grid.
        tdp:          TDP in watts — used to select alpha.

    Returns:
        2D list of floats representing the temperature at each grid node.
    """
    alpha = get_alpha(tdp)
    grid = np.zeros((grid_size, grid_size))

    # Place heat sources at core locations (normalised → grid indices).
    if core_layout:
        for (r, c) in core_layout:
            ri = int(r * (grid_size - 1))
            ci = int(c * (grid_size - 1))
            grid[ri, ci] = source_temp
    else:
        center = grid_size // 2
        grid[center, center] = source_temp

    # Iterative finite-difference: apply the 2D discrete Laplacian.
    for _ in range(steps):
        grid[1:-1, 1:-1] += alpha * (
            grid[2:, 1:-1]       # neighbour below
            + grid[:-2, 1:-1]    # neighbour above
            + grid[1:-1, 2:]     # neighbour right
            + grid[1:-1, :-2]    # neighbour left
            - 4 * grid[1:-1, 1:-1]  # central node (Laplacian)
        )

        # Re-apply fixed heat sources each iteration (Dirichlet BC).
        if core_layout:
            for (r, c) in core_layout:
                ri = int(r * (grid_size - 1))
                ci = int(c * (grid_size - 1))
                grid[ri, ci] = source_temp
        else:
            center = grid_size // 2
            grid[center, center] = source_temp

    return grid.tolist()


def cooling_suggestion(max_temp: float, tdp: float = 65.0) -> str:
    """
    Returns a human-readable cooling recommendation based on the peak
    temperature and the component's TDP class.

    Args:
        max_temp: Maximum temperature observed in the simulation grid (°C).
        tdp:      TDP in watts — high-TDP parts get more aggressive advice.

    Returns:
        A suggestion string suitable for display in the UI or chatbot.
    """
    if max_temp > 90:
        if tdp >= 200:
            return (
                "Critical temperature on high-TDP component. "
                "Liquid cooling or vapour chamber required immediately."
            )
        return "Critical temperature detected. Use heat sink with active cooling fan."

    if max_temp > 70:
        if tdp >= 200:
            return (
                "High temperature on high-TDP component. "
                "Upgrade cooling solution and improve case airflow."
            )
        return "High temperature detected. Improve airflow or apply thermal paste."

    return "Temperature stable. Cooling system adequate."
