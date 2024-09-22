import { asynchandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // Now it will not check validation at this time

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

// Register User
const registerUser = asynchandler(async (req, res) => {

    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required.");
    }

    const exsistedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (exsistedUser)
        throw new ApiError(409, "User with email or username already exists");


    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage))
        coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath)
        throw new ApiError(400, "Avatar file is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar)
        throw new ApiError(400, "Avatar file is required");

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // What you dont want in created user
    )

    if (!createdUser)
        throw new ApiError(500, "Something went wrong while registering the user");

    res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"))
})

// Login User
const loginUser = asynchandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, "User Name or Email is required!")
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user)
        throw new ApiError(404, "User not found");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid)
        throw new ApiError(401, "Invalid user credentials");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Set data in cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // Now from server only the cookies can be modified, other wise from front end also any one can modify it
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully!"));

})

// Logout User
const logoutUser = asynchandler(async (req, res, _) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true // Get Updated Data
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

// Refresh Access Token
const refreshAccessToken = asynchandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incommingRefreshToken)
        throw new ApiError(401, "Unauthorized Token");

    try {
        const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user)
            throw ApiError(401, "Invalid refresh token");

        if (incommingRefreshToken !== user?.refreshToken)
            throw ApiError(401, "Refresh token is expired or used");

        const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id);

        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(200, { accessToken, refreshToken }, "Access Token Refreshed");
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

// Change Password
const changePassword = asynchandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!(oldPassword && newPassowrd))
        throw new ApiError(400, "Old and New both password are required");

    // Check old password
    const isPasswordValid = await User.isPasswordCorrect(oldPassword)

    if (!isPasswordValid)
        throw new ApiError(401, "Invalid Old Password")

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                password: newPassword
            },

        },
        {
            new: true
        }
    );

    res.status(200).json(new ApiResponse(200, {}, "Password updated Successfully"))
})

// Ger Current User
const getCurrentUser = asynchandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, { user: req?.user }, "Current User Fetched Successfully"))
})

// Update User Details
const updateUserDetails = asynchandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!(fullName && email))
        return new ApiError(400, "Full name and Email is required");

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true,
        }
    ).select('-password');

    res.status(200).json(new ApiResponse(200, { user }, "User Details Updated Successfully"));
})

// Update User Avatar
const updateUserAvatar = asynchandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath)
        return new ApiError(400, "Avatar file is missing");

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url)
        return new ApiError(500, "Error while updating Avatar");

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar?.url
            }
        },
        {
            new: true
        }
    )

    res.status(200).json(new ApiResponse(200, { user }, "Cover Image Updated Successfully"));

})


// Update User Cover Photo
const updateUserCoverImage = asynchandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath)
        return new ApiError(400, "Cover Image file is missing");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url)
        return new ApiError(500, "Error while updating Cover Image");

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage?.url
            }
        },
        {
            new: true
        }
    )

    res.status(200).json(new ApiResponse(200, { user }, "Cover Image Updated Successfully"));

})



export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateUserDetails, updateUserAvatar, updateUserCoverImage };