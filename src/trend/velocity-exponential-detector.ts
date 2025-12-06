import regression from 'regression';
import * as stats from 'simple-statistics';

//NOTE: Most of the parameters are left for debugging just for now

interface IVelocityAnalysis {
    velocities: number[]; // tweets/min for each interval
    current_velocity: number; // most recent velocity
    average_velocity: number; // mean velocity
    acceleration: number; // change in velocity
    is_accelerating: boolean; // velocity increasing?
}

interface IExponentialAnalysis {
    growth_rate: number; // 'b' in y = ae^(bx)
    r_squared: number; // fit quality (0-1)
    double_time: number; // minutes to double
    is_exponential: boolean; // fits exponential pattern?
    prediction: number; // predicted next bucket
}

interface IMomentumResult {
    score: number; // 0-100 momentum score
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    velocity: IVelocityAnalysis;
    exponential: IExponentialAnalysis;
}

export class VelocityExponentialDetector {
    // Tunable thresholds
    private readonly EXPONENTIAL_THRESHOLD = 0.1; // growth rate for "exponential"
    private readonly HIGH_CONFIDENCE_R2 = 0.85; // R² for high confidence
    private readonly MEDIUM_CONFIDENCE_R2 = 0.7; // R² for medium confidence

    calculateFinalMomentum(buckets: Array<{ timestamp: number; count: number }>): number {
        return this.calculateMomentum(buckets).score;
    }

    calculateMomentum(buckets: Array<{ timestamp: number; count: number }>): IMomentumResult {
        if (buckets.length < 2) {
            return this.getEmptyResult();
        }

        // Sort chronologically (oldest first)
        const sorted = [...buckets].sort((a, b) => a.timestamp - b.timestamp);

        // Phase 1: Velocity Analysis (instant spike detection)
        const velocity_analysis = this.analyzeVelocity(sorted);

        // Phase 2: Exponential Growth Check (pattern validation)
        const exponential_analysis = this.analyzeExponentialGrowth(sorted);

        // Phase 3: Combined Scoring
        const score = this.calculateCombinedScore(velocity_analysis, exponential_analysis);

        const confidence = this.calculateConfidence(exponential_analysis.r_squared, sorted.length);
        return {
            score,
            confidence,
            velocity: velocity_analysis,
            exponential: exponential_analysis,
        };
    }

    /**
     * PHASE 1: Velocity Analysis
     * Measures rate of change between consecutive buckets
     */
    private analyzeVelocity(
        buckets: Array<{ timestamp: number; count: number }>
    ): IVelocityAnalysis {
        const velocities: number[] = [];

        // Calculate velocity for each interval
        for (let i = 1; i < buckets.length; i++) {
            const time_diff = (buckets[i].timestamp - buckets[i - 1].timestamp) / (1000 * 60); // minutes
            const count_diff = buckets[i].count - buckets[i - 1].count;
            const velocity = time_diff > 0 ? count_diff / time_diff : 0;
            velocities.push(velocity);
        }

        const current_velocity = velocities[velocities.length - 1] || 0;
        const average_velocity = velocities.length > 0 ? stats.mean(velocities) : 0;

        // Calculate acceleration (change in velocity)
        let acceleration = 0;
        if (velocities.length >= 2) {
            // Use weighted recent acceleration
            const recent_velocities = velocities.slice(-3); // last 3 velocities
            const accelerations: number[] = [];
            for (let i = 1; i < recent_velocities.length; i++) {
                accelerations.push(recent_velocities[i] - recent_velocities[i - 1]);
            }
            acceleration = accelerations.length > 0 ? stats.mean(accelerations) : 0;
        }

        const is_accelerating = acceleration > 0 && current_velocity > average_velocity;

        return {
            velocities,
            current_velocity,
            average_velocity,
            acceleration,
            is_accelerating,
        };
    }
    /**
     * PHASE 2: Exponential Growth Analysis
     * Fits exponential curve and validates pattern
     */
    private analyzeExponentialGrowth(
        buckets: Array<{ timestamp: number; count: number }>
    ): IExponentialAnalysis {
        const start_time = buckets[0].timestamp;

        // Prepare data: [minutes_from_start, count]
        const data_points: [number, number][] = buckets.map((b) => [
            (b.timestamp - start_time) / (1000 * 60), // x: minutes
            b.count, // y: tweet count
        ]);

        // Fit exponential curve: y = a * e^(b*x)
        let growth_rate = 0;
        let r_squared = 0;
        let prediction = 0;
        let exponential_result;

        try {
            exponential_result = regression.exponential(data_points);

            // Extract parameters
            const a = exponential_result.equation[0]; // coefficient
            const b = exponential_result.equation[1]; // exponent (growth rate)

            growth_rate = b;
            r_squared = exponential_result.r2;

            // Predict next bucket (5 minutes ahead)
            const last_x = data_points[data_points.length - 1][0];
            prediction = exponential_result.predict(last_x + 5)[1];
        } catch (error) {
            // Exponential fit failed (data might be flat or declining)
            // Fall back to linear
            const linear_result = regression.linear(data_points);
            r_squared = linear_result.r2;
            prediction = linear_result.predict(data_points[data_points.length - 1][0] + 5)[1];
            const m = linear_result.equation[0]; // slope

            growth_rate = m;
        }

        // Calculate doubling time (how long to 2x current size)
        // Formula: t = ln(2) / b
        const double_time = growth_rate > 0 ? Math.log(2) / growth_rate : Infinity;

        // Determine if truly exponential
        const is_exponential =
            growth_rate >= this.EXPONENTIAL_THRESHOLD && r_squared >= this.MEDIUM_CONFIDENCE_R2;

        return {
            growth_rate: Math.round(growth_rate * 10000) / 10000,
            r_squared: Math.round(r_squared * 10000) / 10000,
            double_time: Math.round(double_time * 100) / 100,
            is_exponential,
            prediction: Math.round(prediction),
        };
    }
    /**
     * PHASE 3: Combined Scoring
     * Weights: Velocity (40%) + Exponential Rate (40%) + Fit Quality (20%)
     */
    private calculateCombinedScore(
        velocity: IVelocityAnalysis,
        exponential: IExponentialAnalysis
    ): number {
        // Velocity Score (0-100)
        // 30+ tweets/min = 100, 0 tweets/min = 0
        const velocity_score = Math.min(100, (velocity.current_velocity / 30) * 100);

        // Exponential Growth Score (0-100)
        // Growth rate 0.20+ = 100, 0 = 0
        const exponential_score =
            exponential.growth_rate > 0 ? Math.min(100, (exponential.growth_rate / 0.2) * 100) : 0;

        // Fit Quality Score (0-100)
        // R² directly translates to 0-100
        const fit_score = exponential.r_squared * 100;

        // Weighted combination
        const final_score = velocity_score * 0.4 + exponential_score * 0.4 + fit_score * 0.2;

        // Bonus: Add acceleration boost
        const acceleration_bonus = velocity.is_accelerating ? 10 : 0;

        return Math.min(100, Math.max(0, final_score + acceleration_bonus));
    }
    /**
     * Calculate confidence based on fit quality and data points
     */
    private calculateConfidence(r_squared: number, data_points: number): 'LOW' | 'MEDIUM' | 'HIGH' {
        if (data_points < 3) return 'LOW';
        if (r_squared >= this.HIGH_CONFIDENCE_R2) return 'HIGH';
        if (r_squared >= this.MEDIUM_CONFIDENCE_R2) return 'MEDIUM';
        return 'LOW';
    }
    private getEmptyResult(): IMomentumResult {
        return {
            score: 0,
            confidence: 'LOW',
            velocity: {
                velocities: [],
                current_velocity: 0,
                average_velocity: 0,
                acceleration: 0,
                is_accelerating: false,
            },
            exponential: {
                growth_rate: 0,
                r_squared: 0,
                double_time: Infinity,
                is_exponential: false,
                prediction: 0,
            },
        };
    }
}
